/**
 * tests/summary.test.mjs
 * Tests unitaris per a sidebar/summary.js (funcions pures)
 * Execució: node --test tests/summary.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
// Carregar CURATED_MODELS com a global ABANS de carregar summary.js
// (summary.js accedeix a CURATED_MODELS com a global en buildFallbackList)
const { CURATED_MODELS } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;

const { classifyError, buildFallbackList } = require("../sidebar/summary.js");

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

// ---------------------------------------------------------------------------
// buildFallbackList
// ---------------------------------------------------------------------------

test("buildFallbackList - el model preferit va primer", () => {
    const list = buildFallbackList("gemini-2.5-pro", ["gemini-2.0-flash", "gemini-2.5-flash"]);
    assert.equal(list[0], "gemini-2.5-pro");
});

test("buildFallbackList - no duplica el model preferit", () => {
    const list = buildFallbackList("gemini-2.0-flash", ["gemini-2.0-flash", "gemini-2.5-flash"]);
    const occurrences = list.filter(m => m === "gemini-2.0-flash").length;
    assert.equal(occurrences, 1, "El model preferit no ha d'aparèixer duplicat");
});

test("buildFallbackList - no inclou models sense fallback:true", () => {
    const list = buildFallbackList("gemini-2.0-flash", ["gemini-2.0-flash"]);
    assert.ok(!list.includes("gemini-2.5-pro"), "gemini-2.5-pro no ha d'estar al fallback");
});

test("buildFallbackList - inclou models de CURATED_MODELS amb fallback:true com a darrer recurs", () => {
    // Si l'únic favorit és gemini-2.5-pro, els fallbacks de CURATED_MODELS s'afegeixen
    const list = buildFallbackList("gemini-2.5-pro", ["gemini-2.5-pro"]);
    assert.ok(list.includes("gemini-2.0-flash"), "Ha d'incloure flash com a fallback de CURATED_MODELS");
    assert.ok(list.includes("gemini-2.0-flash-lite"), "Ha d'incloure flash-lite com a fallback");
});
