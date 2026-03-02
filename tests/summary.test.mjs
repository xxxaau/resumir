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

test("classifyError - error genèric retorna missatge original", () => {
    const result = classifyError(new Error("Unexpected network failure"));
    assert.ok(typeof result.message === "string");
    assert.ok(result.message.length > 0);
});
