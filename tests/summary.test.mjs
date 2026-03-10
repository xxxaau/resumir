/**
 * tests/summary.test.mjs
 * Tests unitaris per a sidebar/summary.js (funcions pures)
 * Execució: node --test tests/summary.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { classifyError } = require("../sidebar/summary.js");

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

test("classifyError - clau API invàlida (401) mostra config i missatge en català", () => {
    const result = classifyError(new Error("Error API (401): API key not valid"));
    assert.equal(result.showConfig, true);
    assert.ok(result.message.includes("clau API"), "El missatge ha d'esmentar 'clau API'");
});

test("classifyError - permís denegat mostra config i missatge de permisos", () => {
    const result = classifyError(new Error("Permission denied"));
    assert.equal(result.showConfig, true);
    assert.ok(result.message.includes("permisos"), "El missatge ha d'esmentar 'permisos'");
});

test("classifyError - error 403 classificat igual que 401", () => {
    const result = classifyError(new Error("Error API (403): Forbidden"));
    assert.equal(result.showConfig, true);
    assert.ok(result.message.includes("clau API"));
});

test("classifyError - quota esgotada (429) sense botó de config", () => {
    const result = classifyError(new Error("Error API (429): quota exceeded"));
    assert.equal(result.showConfig, false);
    assert.ok(result.message.includes("429") || result.message.toLowerCase().includes("quota"));
});

test("classifyError - quota esgotada per paraula 'exhausted'", () => {
    const result = classifyError(new Error("[003] Resource has been exhausted"));
    assert.equal(result.showConfig, false);
});

test("classifyError - 'missing host permission' classificat com a permís", () => {
    const result = classifyError(new Error("Missing host permission for https://example.com"));
    assert.equal(result.showConfig, true);
    assert.ok(result.message.includes("permisos"));
});

test("classifyError - 'access denied' classificat com a permís", () => {
    const result = classifyError(new Error("Access denied to tab content"));
    assert.equal(result.showConfig, true);
    assert.ok(result.message.includes("permisos"));
});

test("classifyError - API key faltant (missatge [001]) mostra config", () => {
    const result = classifyError(new Error("[001] No s'ha configurat la API Key."));
    assert.equal(result.showConfig, true);
});

test("classifyError - error genèric retorna missatge original sense config", () => {
    const result = classifyError(new Error("Unexpected network failure"));
    assert.equal(result.showConfig, false);
    assert.equal(result.message, "Unexpected network failure");
});
