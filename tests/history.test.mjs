/**
 * tests/history.test.mjs
 * Tests unitaris per a sidebar/cache.js: listCachedSummaries
 * Execució: node --test tests/history.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Mock de ext.storage.local (in-memory) — mateix patró que cache.test.mjs
// ---------------------------------------------------------------------------

function createStorageMock() {
    const store = {};
    return {
        async get(keys) {
            if (typeof keys === "string") return { [keys]: store[keys] };
            if (Array.isArray(keys)) return Object.fromEntries(keys.map(k => [k, store[k]]));
            return { ...store };  // handles null (get all)
        },
        async set(obj) { Object.assign(store, obj); },
        async remove(keys) {
            const ks = typeof keys === "string" ? [keys] : keys;
            ks.forEach(k => delete store[k]);
        },
        _clear() { Object.keys(store).forEach(k => delete store[k]); },
    };
}

const storageMock = createStorageMock();
global.ext = { storage: { local: storageMock } };

const { listCachedSummaries } = require("../sidebar/cache.js");

function clearStorage() { storageMock._clear(); }

function makeEntry(overrides = {}) {
    return {
        url: "https://example.com",
        title: "Test Title",
        summary: "Test summary content",
        model: "gemini-2.0-flash",
        timestamp: new Date().toISOString(),
        version: "1.0",
        stats: { input: 100, output: 50 },
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// listCachedSummaries
// ---------------------------------------------------------------------------

test("listCachedSummaries - descarta entrades sense timestamp", async () => {
    clearStorage();
    const entry = makeEntry();
    delete entry.timestamp;
    await storageMock.set({ "summary_cache:https://example.com": entry });
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
});

test("listCachedSummaries - descarta entrades caducades (>30 dies)", async () => {
    clearStorage();
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        "summary_cache:https://old.com": makeEntry({ url: "https://old.com", timestamp: oldDate }),
    });
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
});

test("listCachedSummaries - retorna entrades vàlides ordenades per data desc", async () => {
    clearStorage();
    const now = Date.now();
    const older = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const newer = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        "summary_cache:https://older.com": makeEntry({ url: "https://older.com", timestamp: older }),
        "summary_cache:https://newer.com": makeEntry({ url: "https://newer.com", timestamp: newer }),
    });
    const result = await listCachedSummaries();
    assert.equal(result.length, 2);
    assert.equal(result[0].url, "https://newer.com");
    assert.equal(result[1].url, "https://older.com");
});

test("listCachedSummaries - retorna array buit si no hi ha caché vàlida", async () => {
    clearStorage();
    const result = await listCachedSummaries();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
});

test("listCachedSummaries - retorna array buit (no llança) si storage falla", async () => {
    const failMock = { async get() { throw new Error("Storage unavailable"); } };
    global.ext = { storage: { local: failMock } };
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
    // Restore
    global.ext = { storage: { local: storageMock } };
});
