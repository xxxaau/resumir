/**
 * tests/stats.test.mjs
 * Tests unitaris per a sidebar/stats.js
 * Execució: node --test tests/stats.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

const storageMock = createStorageMock();
// _setHistory és específic d'aquest test: injecta dades d'historial directament
storageMock._setHistory = (entries) => storageMock._set({ usageHistory: entries });
global.ext = { storage: { local: storageMock } };

const { getDailyStats } = require("../sidebar/stats.js");

// Helpers
const TODAY = new Date().toISOString();
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString();

function makeEntry(model, date = TODAY) {
    return { model, date, inputTokens: 10, outputTokens: 5, type: "lite" };
}

function clearStorage() { storageMock._clear(); }

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

test("getDailyStats - accepta camp 'timestamp' com a alternativa a 'date'", async () => {
    clearStorage();
    // Algunes entrades antigues poden usar 'timestamp' en comptes de 'date'
    storageMock._setHistory([
        { model: "gemini-2.0-flash", timestamp: TODAY, inputTokens: 10 },
        { model: "gemini-2.0-flash", timestamp: YESTERDAY, inputTokens: 10 },
    ]);
    const { byModel, total } = await getDailyStats("gemini-2.0-flash");
    assert.equal(byModel, 1);
    assert.equal(total, 1);
});

test("getDailyStats - ignora entrades sense cap data", async () => {
    clearStorage();
    storageMock._setHistory([
        { model: "gemini-2.0-flash", inputTokens: 10 }, // sense data
    ]);
    const { byModel, total } = await getDailyStats("gemini-2.0-flash");
    assert.equal(byModel, 0);
    assert.equal(total, 0);
});
