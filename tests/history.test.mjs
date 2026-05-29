import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

const storageMock = createStorageMock();
global.ext = { storage: { local: storageMock } };

global.CONTENT_TYPES = [
    { id: "summary",    icon: "\u{1F4DD}", label: "Resum",            order: 1 },
    { id: "deepdive",   icon: "\u{1F52C}", label: "Aprofundiment",    order: 2 },
    { id: "conceptmap", icon: "\u{1F9E0}", label: "Mapa conceptual",  order: 3 },
    { id: "science",    icon: "\u{1F4CA}", label: "Validaci\u00F3",   order: 4 },
];

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
        type: "summary",
        ...overrides,
    };
}

test("listCachedSummaries - descarta entrades sense timestamp", async () => {
    clearStorage();
    const entry = makeEntry();
    delete entry.timestamp;
    await storageMock.set({ "summary_cache:https://example.com:summary": entry });
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
});

test("listCachedSummaries - descarta entrades caducades (>30 dies)", async () => {
    clearStorage();
    const oldDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        "summary_cache:https://old.com:summary": makeEntry({ url: "https://old.com", timestamp: oldDate }),
    });
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
});

test("listCachedSummaries - retorna entrades valides ordenades per data desc", async () => {
    clearStorage();
    const now = Date.now();
    const older = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();
    const newer = new Date(now - 1 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        "summary_cache_index": ["summary_cache:https://older.com:summary", "summary_cache:https://newer.com:summary"],
        "summary_cache:https://older.com:summary": makeEntry({ url: "https://older.com", timestamp: older }),
        "summary_cache:https://newer.com:summary": makeEntry({ url: "https://newer.com", timestamp: newer }),
    });
    const result = await listCachedSummaries();
    assert.equal(result.length, 2);
    assert.equal(result[0].url, "https://newer.com");
    assert.equal(result[1].url, "https://older.com");
});

test("listCachedSummaries - retorna array buit si no hi ha cache valida", async () => {
    clearStorage();
    const result = await listCachedSummaries();
    assert.ok(Array.isArray(result));
    assert.equal(result.length, 0);
});

test("listCachedSummaries - retorna array buit (no llanca) si storage falla", async () => {
    const failMock = { async get() { throw new Error("Storage unavailable"); } };
    global.ext = { storage: { local: failMock } };
    const result = await listCachedSummaries();
    assert.equal(result.length, 0);
    global.ext = { storage: { local: storageMock } };
});

test("listCachedSummaries - retorna el tipus correcte per cada entrada", async () => {
    clearStorage();
    await storageMock.set({
        "summary_cache_index": [
            "summary_cache:https://a.com:summary",
            "summary_cache:https://a.com:deepdive",
            "summary_cache:https://b.com:science",
        ],
        "summary_cache:https://a.com:summary": makeEntry({ url: "https://a.com", type: "summary" }),
        "summary_cache:https://a.com:deepdive": makeEntry({ url: "https://a.com", title: "Deep", type: "deepdive" }),
        "summary_cache:https://b.com:science": makeEntry({ url: "https://b.com", title: "Science", type: "science" }),
    });
    const entries = await listCachedSummaries();
    assert.equal(entries.length, 3);
    const summary = entries.find(e => e.type === "summary");
    const deepdive = entries.find(e => e.type === "deepdive");
    const science = entries.find(e => e.type === "science");
    assert.ok(summary);
    assert.ok(deepdive);
    assert.ok(science);
    assert.equal(deepdive.title, "Deep");
});
