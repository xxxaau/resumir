/**
 * tests/stats.test.mjs
 * Tests unitaris per a sidebar/stats.js
 * Execució: node --test tests/stats.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Mock de ext.storage.local (in-memory)
// ---------------------------------------------------------------------------

function createStorageMock() {
    const store = {};
    return {
        async get(keys) {
            if (typeof keys === "string") return { [keys]: store[keys] };
            if (Array.isArray(keys)) return Object.fromEntries(keys.map(k => [k, store[k]]));
            return { ...store };
        },
        async set(obj) { Object.assign(store, obj); },
        _clear() { Object.keys(store).forEach(k => delete store[k]); },
        _setHistory(entries) { store.usageHistory = entries; },
    };
}

const storageMock = createStorageMock();
global.ext = { storage: { local: storageMock } };

const { getDailyStats, getTodayRequestCount, getTotalTodayCount } = require("../sidebar/stats.js");

// Helpers
const TODAY = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();

function makeEntry(model, date = TODAY) {
    return { model, date, inputTokens: 10, outputTokens: 5, type: "lite" };
}

function clearStorage() { storageMock._clear(); }

// ---------------------------------------------------------------------------
// getTodayRequestCount
// ---------------------------------------------------------------------------

test("getTodayRequestCount - retorna 0 si l'historial és buit", async () => {
    clearStorage();
    const count = await getTodayRequestCount("gemini-2.0-flash");
    assert.equal(count, 0);
});

test("getTodayRequestCount - compta les entrades d'avui per al model especificat", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.0-flash"),
        makeEntry("gemini-2.0-flash"),
        makeEntry("gemini-2.5-pro"),
    ]);
    const count = await getTodayRequestCount("gemini-2.0-flash");
    assert.equal(count, 2);
});

test("getTodayRequestCount - ignora entrades d'altres models", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.5-pro"),
        makeEntry("gemini-2.5-pro"),
    ]);
    const count = await getTodayRequestCount("gemini-2.0-flash");
    assert.equal(count, 0);
});

test("getTodayRequestCount - ignora entrades d'ahir", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.0-flash", YESTERDAY),
        makeEntry("gemini-2.0-flash", TODAY),
    ]);
    const count = await getTodayRequestCount("gemini-2.0-flash");
    assert.equal(count, 1);
});

test("getTodayRequestCount - accepta camp 'timestamp' com a alternativa a 'date'", async () => {
    clearStorage();
    // Alguns entrades antigues poden usar 'timestamp' en comptes de 'date'
    storageMock._setHistory([
        { model: "gemini-2.0-flash", timestamp: TODAY, inputTokens: 10 },
        { model: "gemini-2.0-flash", timestamp: YESTERDAY, inputTokens: 10 },
    ]);
    const count = await getTodayRequestCount("gemini-2.0-flash");
    assert.equal(count, 1);
});

test("getTodayRequestCount - retorna 0 si l'entrada no té cap data", async () => {
    clearStorage();
    storageMock._setHistory([
        { model: "gemini-2.0-flash", inputTokens: 10 }, // sense data
    ]);
    const count = await getTodayRequestCount("gemini-2.0-flash");
    assert.equal(count, 0);
});

// ---------------------------------------------------------------------------
// getTotalTodayCount
// ---------------------------------------------------------------------------

test("getTotalTodayCount - retorna 0 si l'historial és buit", async () => {
    clearStorage();
    const count = await getTotalTodayCount();
    assert.equal(count, 0);
});

test("getTotalTodayCount - compta totes les entrades d'avui (tots els models)", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.0-flash"),
        makeEntry("gemini-2.5-pro"),
        makeEntry("gemma-3-27b-it"),
    ]);
    const count = await getTotalTodayCount();
    assert.equal(count, 3);
});

test("getTotalTodayCount - ignora entrades d'ahir", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.0-flash", TODAY),
        makeEntry("gemini-2.5-pro", YESTERDAY),
        makeEntry("gemma-3-27b-it", YESTERDAY),
    ]);
    const count = await getTotalTodayCount();
    assert.equal(count, 1);
});

test("getTotalTodayCount - retorna 0 si totes les entrades són d'ahir", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.0-flash", YESTERDAY),
        makeEntry("gemini-2.5-pro", YESTERDAY),
    ]);
    const count = await getTotalTodayCount();
    assert.equal(count, 0);
});

// ---------------------------------------------------------------------------
// getDailyStats
// ---------------------------------------------------------------------------

test("getDailyStats - retorna byModel i total amb una sola crida", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.0-flash"),
        makeEntry("gemini-2.0-flash"),
        makeEntry("gemini-2.5-pro"),
        makeEntry("gemini-2.0-flash", YESTERDAY),
    ]);
    const { byModel, total } = await getDailyStats("gemini-2.0-flash");
    assert.equal(byModel, 2, "byModel ha de ser 2 (ignora ahir)");
    assert.equal(total, 3, "total ha de ser 3 (tots els models d'avui)");
});

test("getDailyStats - historial buit retorna zeros", async () => {
    clearStorage();
    const { byModel, total } = await getDailyStats("gemini-2.0-flash");
    assert.equal(byModel, 0);
    assert.equal(total, 0);
});

test("getDailyStats - model diferent: byModel 0, total correcte", async () => {
    clearStorage();
    storageMock._setHistory([
        makeEntry("gemini-2.5-pro"),
        makeEntry("gemini-2.5-pro"),
    ]);
    const { byModel, total } = await getDailyStats("gemini-2.0-flash");
    assert.equal(byModel, 0);
    assert.equal(total, 2);
});
