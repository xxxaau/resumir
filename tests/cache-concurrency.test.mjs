import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

// Storage com el real: get() retorna còpies i cada operació és asíncrona de veritat.
const inner = createStorageMock();
const tick = () => new Promise(r => setTimeout(r, 1));
global.ext = {
    storage: {
        local: {
            async get(k) { await tick(); return structuredClone(await inner.get(k)); },
            async set(o) { await tick(); return inner.set(structuredClone(o)); },
            async remove(k) { await tick(); return inner.remove(k); },
        },
    },
};
global.CONTENT_TYPES = [{ id: "summary" }, { id: "deepdive" }];
const { saveSummaryCache, deleteSummaryCache, getCacheKey } = require("../sidebar/cache.js");

test("cache: dos desats simultanis no es trepitgen l'índex", async () => {
    inner._clear();
    const urls = ["https://a.com", "https://b.com", "https://c.com"];
    await Promise.all(urls.map(u => saveSummaryCache(u, "T", "R", "m", 1, 1)));
    const index = inner._dump()["summary_cache_index"] || inner._dump()[Object.keys(inner._dump()).find(k => /index/i.test(k))];
    for (const u of urls) assert.ok(index.includes(getCacheKey(u, "summary")), `l'índex ha de tenir ${u}`);
});

test("cache: un desat i un esborrat simultanis deixen l'índex coherent", async () => {
    inner._clear();
    await saveSummaryCache("https://old.com", "T", "R", "m", 1, 1);
    await Promise.all([
        saveSummaryCache("https://new.com", "T", "R", "m", 1, 1),
        deleteSummaryCache("https://old.com", "summary"),
    ]);
    const dump = inner._dump();
    const index = dump[Object.keys(dump).find(k => /index/i.test(k))];
    assert.ok(index.includes(getCacheKey("https://new.com", "summary")));
    assert.ok(!index.includes(getCacheKey("https://old.com", "summary")));
});
