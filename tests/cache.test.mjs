/**
 * tests/cache.test.mjs
 * Tests unitaris per a sidebar/cache.js
 * Execució: node --test tests/cache.test.mjs
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
        async remove(keys) {
            const ks = typeof keys === "string" ? [keys] : keys;
            ks.forEach(k => delete store[k]);
        },
        _clear() { Object.keys(store).forEach(k => delete store[k]); },
    };
}

const storageMock = createStorageMock();
global.ext = { storage: { local: storageMock } };

const { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries } = require("../sidebar/cache.js");

// Neteja la memòria entre tests
function clearStorage() { storageMock._clear(); }

// ---------------------------------------------------------------------------
// getSummaryCache
// ---------------------------------------------------------------------------

test("getSummaryCache - retorna null si no hi ha entrada a la cache", async () => {
    clearStorage();
    const result = await getSummaryCache("https://example.com");
    assert.equal(result, null);
});

test("getSummaryCache - retorna l'entrada si existeix", async () => {
    clearStorage();
    const url = "https://example.com/article";
    await saveSummaryCache(url, "Títol", "Resum de prova", "gemini-2.0-flash", 100, 50);
    const result = await getSummaryCache(url);
    assert.ok(result !== null, "Ha de retornar una entrada");
    assert.equal(result.url, url);
    assert.equal(result.title, "Títol");
    assert.equal(result.summary, "Resum de prova");
});

// ---------------------------------------------------------------------------
// saveSummaryCache
// ---------------------------------------------------------------------------

test("saveSummaryCache - desa l'estructura correcta", async () => {
    clearStorage();
    const url = "https://test.com/page";
    const ok = await saveSummaryCache(url, "Títol test", "Contingut resum", "gemini-2.5-flash", 200, 80);
    assert.equal(ok, true);

    const entry = await getSummaryCache(url);
    assert.equal(entry.url, url);
    assert.equal(entry.title, "Títol test");
    assert.equal(entry.summary, "Contingut resum");
    assert.equal(entry.model, "gemini-2.5-flash");
    assert.equal(entry.version, "1.0");
    assert.ok(entry.timestamp, "Ha de tenir timestamp");
    assert.equal(entry.stats.input, 200);
    assert.equal(entry.stats.output, 80);
});

test("saveSummaryCache - clau de cache basada en la URL", async () => {
    clearStorage();
    const urlA = "https://a.com";
    const urlB = "https://b.com";
    await saveSummaryCache(urlA, "A", "Resum A", "model-a", 10, 5);
    await saveSummaryCache(urlB, "B", "Resum B", "model-b", 20, 10);

    const entryA = await getSummaryCache(urlA);
    const entryB = await getSummaryCache(urlB);
    assert.equal(entryA.title, "A");
    assert.equal(entryB.title, "B");
});

test("saveSummaryCache - sobreescriu entrada existent per la mateixa URL", async () => {
    clearStorage();
    const url = "https://overwrite.com";
    await saveSummaryCache(url, "Primer", "Resum inicial", "model-1", 10, 5);
    await saveSummaryCache(url, "Segon", "Resum actualitzat", "model-2", 20, 10);

    const entry = await getSummaryCache(url);
    assert.equal(entry.title, "Segon");
    assert.equal(entry.summary, "Resum actualitzat");
    assert.equal(entry.model, "model-2");
});

// ---------------------------------------------------------------------------
// saveUsageStats
// ---------------------------------------------------------------------------

test("saveUsageStats - crea una entrada a l'historial", async () => {
    clearStorage();
    const result = await saveUsageStats(100, 50, false, "gemini-2.0-flash", 1200, "Article test", "https://test.com");
    assert.ok(result !== null);
    assert.equal(result.articles, 1);
    assert.equal(result.tokens, 150);
});

test("saveUsageStats - incrementa el comptador d'articles i tokens", async () => {
    clearStorage();
    await saveUsageStats(100, 50, false, "model-a", 1000, "A", "https://a.com");
    const result = await saveUsageStats(200, 100, false, "model-b", 2000, "B", "https://b.com");
    assert.equal(result.articles, 2);
    assert.equal(result.tokens, 450);
});

test("saveUsageStats - l'entrada de l'historial té els camps correctes", async () => {
    clearStorage();
    await saveUsageStats(80, 40, true, "gemini-2.5-pro", 3000, "Titular", "https://pro.com");

    const data = await storageMock.get("usageHistory");
    const history = data.usageHistory;
    assert.equal(history.length, 1);
    const entry = history[0];
    assert.equal(entry.model, "gemini-2.5-pro");
    assert.equal(entry.inputTokens, 80);
    assert.equal(entry.outputTokens, 40);
    assert.equal(entry.type, "deep");
    assert.equal(entry.latency, 3000);
    assert.equal(entry.title, "Titular");
    assert.equal(entry.url, "https://pro.com");
    assert.equal(entry.cacheTokens, 0); // default quan no es passa
});

test("saveUsageStats - l'entrada és 'lite' per a models no-pro sense isDeepDive", async () => {
    clearStorage();
    await saveUsageStats(50, 25, false, "gemini-2.0-flash", 500, "T", "https://t.com");
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory[0].type, "lite");
});

test("saveUsageStats - l'historial es limita a 1000 entrades (no creix indefinidament)", async () => {
    clearStorage();
    // Omplim 1001 entrades
    for (let i = 0; i < 1001; i++) {
        await saveUsageStats(10, 5, false, "model-x", 100, `Article ${i}`, `https://test.com/${i}`);
    }
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory.length, 1000);
});

test("saveUsageStats - l'entrada més recent va primer (unshift)", async () => {
    clearStorage();
    await saveUsageStats(10, 5, false, "model-a", 100, "Primer", "https://first.com");
    await saveUsageStats(20, 10, false, "model-b", 200, "Segon", "https://second.com");
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory[0].title, "Segon");
    assert.equal(data.usageHistory[1].title, "Primer");
});

// ---------------------------------------------------------------------------
// TTL i purgeStaleCacheEntries
// ---------------------------------------------------------------------------

test("getSummaryCache - retorna null per a entrades més velles que el TTL", async () => {
    clearStorage();
    const url = "https://old-article.com";
    // Desar una entrada amb timestamp de fa 31 dies
    const oldTimestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        [`summary_cache:${url}`]: { url, title: "Vell", summary: "Antic", timestamp: oldTimestamp, version: "1.0", stats: {} }
    });
    const result = await getSummaryCache(url);
    assert.equal(result, null, "Ha de retornar null per entrades expirades");
});

test("getSummaryCache - retorna l'entrada si és dins el TTL", async () => {
    clearStorage();
    const url = "https://fresh-article.com";
    await saveSummaryCache(url, "Fresc", "Resum fresc", "model", 10, 5);
    const result = await getSummaryCache(url);
    assert.ok(result !== null, "Ha de retornar l'entrada fresca");
});

test("purgeStaleCacheEntries - elimina entrades antigues i retorna el nombre eliminat", async () => {
    clearStorage();
    const oldTs = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const freshTs = new Date().toISOString();
    await storageMock.set({
        "summary_cache:https://old.com": { url: "https://old.com", title: "Vell", summary: "X", timestamp: oldTs, version: "1.0", stats: {} },
        "summary_cache:https://fresh.com": { url: "https://fresh.com", title: "Fresc", summary: "Y", timestamp: freshTs, version: "1.0", stats: {} },
        "stats": { articles: 5, tokens: 1000 }, // no és caché, no s'ha d'eliminar
    });
    const removed = await purgeStaleCacheEntries();
    assert.equal(removed, 1, "Ha d'eliminar 1 entrada expirada");
    const old = await getSummaryCache("https://old.com");
    assert.equal(old, null, "L'entrada vella ha de ser eliminada");
    const fresh = await getSummaryCache("https://fresh.com");
    assert.ok(fresh !== null, "L'entrada fresca ha de continuar");
});

test("purgeStaleCacheEntries - retorna 0 si no hi ha entrades a purgar", async () => {
    clearStorage();
    await saveSummaryCache("https://new.com", "Nou", "Resum", "model", 10, 5);
    const removed = await purgeStaleCacheEntries();
    assert.equal(removed, 0);
});

test("getSummaryCache - retorna null per entrades sense timestamp (considerades expirades)", async () => {
    clearStorage();
    const url = "https://no-ts.com";
    await storageMock.set({
        [`summary_cache:${url}`]: { url, title: "No TS", summary: "X" }
    });
    const result = await getSummaryCache(url);
    assert.equal(result, null, "Ha de retornar null per entrades sense timestamp");
});

test("purgeStaleCacheEntries - elimina entrades sense timestamp (considerades expirades)", async () => {
    clearStorage();
    await storageMock.set({
        "summary_cache:https://no-ts.com": { url: "https://no-ts.com", title: "X", summary: "Y" }
    });
    const removed = await purgeStaleCacheEntries();
    assert.equal(removed, 1, "Ha d'eliminar l'entrada sense timestamp");
});

test("saveUsageStats - cacheTokens es guarda correctament", async () => {
    clearStorage();
    await saveUsageStats(100, 50, false, "gemini-2.0-flash", 1000, "T", "https://t.com", 25);
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory[0].cacheTokens, 25);
});

// ---------------------------------------------------------------------------
// dailyStats
// ---------------------------------------------------------------------------

test("saveUsageStats - dailyStats incrementa el comptador del dia actual", async () => {
    clearStorage();
    const todayKey = new Date().toISOString().slice(0, 10);
    await saveUsageStats(100, 50, false, "gemini-2.0-flash", 1000, "T", "https://t.com");
    const data = await storageMock.get("dailyStats");
    assert.equal(data.dailyStats[todayKey], 1, "Ha de comptar 1 per avui");
});

test("saveUsageStats - dailyStats acumula múltiples resums del mateix dia", async () => {
    clearStorage();
    const todayKey = new Date().toISOString().slice(0, 10);
    await saveUsageStats(100, 50, false, "model-a", 1000, "A", "https://a.com");
    await saveUsageStats(200, 80, false, "model-b", 1200, "B", "https://b.com");
    await saveUsageStats(150, 60, false, "model-c", 900, "C", "https://c.com");
    const data = await storageMock.get("dailyStats");
    assert.equal(data.dailyStats[todayKey], 3, "Ha d'acumular 3 resums per avui");
});

test("saveUsageStats - dailyStats preserva comptadors d'altres dies", async () => {
    clearStorage();
    const todayKey = new Date().toISOString().slice(0, 10);
    const yesterdayKey = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    // Injectar un comptador d'ahir
    await storageMock.set({ dailyStats: { [yesterdayKey]: 5 } });
    await saveUsageStats(100, 50, false, "model-a", 1000, "T", "https://t.com");
    const data = await storageMock.get("dailyStats");
    assert.equal(data.dailyStats[yesterdayKey], 5, "El comptador d'ahir s'ha de preservar");
    assert.equal(data.dailyStats[todayKey], 1, "El comptador d'avui ha de ser 1");
});
