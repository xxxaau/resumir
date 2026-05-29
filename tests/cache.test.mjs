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

const { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries, getAvailableTypes, deleteSummaryCache, getCacheKey } = require("../sidebar/cache.js");

function clearStorage() { storageMock._clear(); }

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
    assert.equal(entry.type, "summary");
});

test("saveSummaryCache - clau de cache basada en la URL i tipus", async () => {
    clearStorage();
    const url = "https://a.com";
    await saveSummaryCache(url, "Resum", "Resum A", "model-a", 10, 5, "summary");
    await saveSummaryCache(url, "Deep", "Deep A", "model-a", 10, 5, "deepdive");
    await saveSummaryCache(url, "Science", "Science A", "model-a", 10, 5, "science");

    const entrySummary = await getSummaryCache(url, "summary");
    const entryDeep = await getSummaryCache(url, "deepdive");
    const entryScience = await getSummaryCache(url, "science");

    assert.equal(entrySummary.title, "Resum");
    assert.equal(entryDeep.title, "Deep");
    assert.equal(entryScience.title, "Science");
});

test("saveSummaryCache - sobreescriu entrada existent per la mateixa URL i tipus", async () => {
    clearStorage();
    const url = "https://overwrite.com";
    await saveSummaryCache(url, "Primer", "Resum inicial", "model-1", 10, 5, "deepdive");
    await saveSummaryCache(url, "Segon", "Resum actualitzat", "model-2", 20, 10, "deepdive");

    const entry = await getSummaryCache(url, "deepdive");
    assert.equal(entry.title, "Segon");
    assert.equal(entry.summary, "Resum actualitzat");
    assert.equal(entry.model, "model-2");
});

test("saveSummaryCache - diferents tipus per la mateixa URL no s'afecten", async () => {
    clearStorage();
    const url = "https://multi.com";
    await saveSummaryCache(url, "Resum", "Contingut resum", "model-a", 10, 5, "summary");
    await saveSummaryCache(url, "Deep", "Contingut deep", "model-b", 20, 10, "deepdive");

    const sum = await getSummaryCache(url, "summary");
    const deep = await getSummaryCache(url, "deepdive");

    assert.equal(sum.title, "Resum");
    assert.equal(deep.title, "Deep");
});

test("getAvailableTypes - retorna els tipus disponibles per una URL", async () => {
    clearStorage();
    const url = "https://multi-types.com";
    await saveSummaryCache(url, "Resum", "R", "model-a", 10, 5, "summary");
    await saveSummaryCache(url, "Deep", "D", "model-b", 20, 10, "deepdive");

    const types = await getAvailableTypes(url);
    assert.ok(types.includes("summary"));
    assert.ok(types.includes("deepdive"));
    assert.equal(types.length, 2);
});

test("getAvailableTypes - retorna array buit per URL sense cache", async () => {
    clearStorage();
    const types = await getAvailableTypes("https://no-cache.com");
    assert.deepEqual(types, []);
});

test("getCacheKey - genera la clau correcta", () => {
    assert.equal(getCacheKey("https://example.com", "summary"), "summary_cache:https://example.com:summary");
    assert.equal(getCacheKey("https://example.com", "deepdive"), "summary_cache:https://example.com:deepdive");
    assert.equal(getCacheKey("https://example.com", "science"), "summary_cache:https://example.com:science");
});

test("deleteSummaryCache - elimina una entrada especifica", async () => {
    clearStorage();
    const url = "https://delete.com";
    await saveSummaryCache(url, "Resum", "R", "model", 10, 5, "summary");
    await saveSummaryCache(url, "Deep", "D", "model", 10, 5, "deepdive");

    const deleted = await deleteSummaryCache(url, "deepdive");
    assert.equal(deleted, true);

    const entry = await getSummaryCache(url, "deepdive");
    assert.equal(entry, null);

    const remaining = await getSummaryCache(url, "summary");
    assert.ok(remaining !== null);
});

test("deleteSummaryCache - retorna false si l'entrada no existeix", async () => {
    clearStorage();
    const deleted = await deleteSummaryCache("https://no-exist.com", "summary");
    assert.equal(deleted, false);
});

test("getSummaryCache - llegir clau legacy (sense tipus) funciona com summary", async () => {
    clearStorage();
    const url = "https://legacy.com";
    await storageMock.set({
        [`summary_cache:${url}`]: { url, title: "Legacy", summary: "Old format", model: "m", timestamp: new Date().toISOString(), version: "1.0", stats: {} }
    });
    const entry = await getSummaryCache(url, "summary");
    assert.ok(entry !== null);
    assert.equal(entry.title, "Legacy");
});

test("getSummaryCache - retorna null per a entrades mes velles que el TTL", async () => {
    clearStorage();
    const url = "https://old-article.com";
    const oldTimestamp = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await storageMock.set({
        [`summary_cache:${url}:summary`]: { url, title: "Vell", summary: "Antic", timestamp: oldTimestamp, version: "1.0", stats: {} }
    });
    const result = await getSummaryCache(url);
    assert.equal(result, null, "Ha de retornar null per entrades expirades");
});

test("getSummaryCache - retorna l'entrada si es dins el TTL", async () => {
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
        "summary_cache_index": ["summary_cache:https://old.com:summary", "summary_cache:https://fresh.com:summary"],
        "summary_cache:https://old.com:summary": { url: "https://old.com", title: "Vell", summary: "X", timestamp: oldTs, version: "1.0", stats: {} },
        "summary_cache:https://fresh.com:summary": { url: "https://fresh.com", title: "Fresc", summary: "Y", timestamp: freshTs, version: "1.0", stats: {} },
        "stats": { articles: 5, tokens: 1000 },
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
        [`summary_cache:${url}:summary`]: { url, title: "No TS", summary: "X" }
    });
    const result = await getSummaryCache(url);
    assert.equal(result, null, "Ha de retornar null per entrades sense timestamp");
});

test("purgeStaleCacheEntries - elimina entrades sense timestamp (considerades expirades)", async () => {
    clearStorage();
    await storageMock.set({
        "summary_cache_index": ["summary_cache:https://no-ts.com:summary"],
        "summary_cache:https://no-ts.com:summary": { url: "https://no-ts.com", title: "X", summary: "Y" }
    });
    const removed = await purgeStaleCacheEntries();
    assert.equal(removed, 1, "Ha d'eliminar l'entrada sense timestamp");
});

test("saveUsageStats - crea una entrada a l'historial", async () => {
    clearStorage();
    const result = await saveUsageStats(100, 50, "summary", "gemini-2.0-flash", 1200, "Article test", "https://test.com");
    assert.ok(result !== null);
    assert.equal(result.articles, 1);
    assert.equal(result.tokens, 150);
});

test("saveUsageStats - incrementa el comptador d'articles i tokens", async () => {
    clearStorage();
    await saveUsageStats(100, 50, "summary", "model-a", 1000, "A", "https://a.com");
    const result = await saveUsageStats(200, 100, "summary", "model-b", 2000, "B", "https://b.com");
    assert.equal(result.articles, 2);
    assert.equal(result.tokens, 450);
});

test("saveUsageStats - l'entrada de l'historial te els camps correctes", async () => {
    clearStorage();
    await saveUsageStats(80, 40, "deepdive", "gemini-2.5-pro", 3000, "Titular", "https://pro.com");

    const data = await storageMock.get("usageHistory");
    const history = data.usageHistory;
    assert.equal(history.length, 1);
    const entry = history[0];
    assert.equal(entry.model, "gemini-2.5-pro");
    assert.equal(entry.inputTokens, 80);
    assert.equal(entry.outputTokens, 40);
    assert.equal(entry.type, "deepdive");
    assert.equal(entry.latency, 3000);
    assert.equal(entry.title, "Titular");
    assert.equal(entry.url, "https://pro.com");
    assert.equal(entry.cacheTokens, 0);
});

test("saveUsageStats - el tipus summary per defecte", async () => {
    clearStorage();
    await saveUsageStats(50, 25, "summary", "gemini-2.0-flash", 500, "T", "https://t.com");
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory[0].type, "summary");
});

test("saveUsageStats - suporta contentType deepdive, science, conceptmap", async () => {
    clearStorage();
    await saveUsageStats(10, 5, "deepdive", "m-a", 100, "A", "https://a.com");
    await saveUsageStats(10, 5, "science", "m-b", 100, "B", "https://b.com");
    await saveUsageStats(10, 5, "conceptmap", "m-c", 100, "C", "https://c.com");
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory[0].type, "conceptmap");
    assert.equal(data.usageHistory[1].type, "science");
    assert.equal(data.usageHistory[2].type, "deepdive");
});

test("saveUsageStats - l'historial es limita a 1000 entrades", async () => {
    clearStorage();
    for (let i = 0; i < 1001; i++) {
        await saveUsageStats(10, 5, "summary", "model-x", 100, `Article ${i}`, `https://test.com/${i}`);
    }
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory.length, 1000);
});

test("saveUsageStats - l'entrada mes recent va primer (unshift)", async () => {
    clearStorage();
    await saveUsageStats(10, 5, "summary", "model-a", 100, "Primer", "https://first.com");
    await saveUsageStats(20, 10, "summary", "model-b", 200, "Segon", "https://second.com");
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory[0].title, "Segon");
    assert.equal(data.usageHistory[1].title, "Primer");
});

test("saveUsageStats - cacheTokens es guarda correctament", async () => {
    clearStorage();
    await saveUsageStats(100, 50, "summary", "gemini-2.0-flash", 1000, "T", "https://t.com", 25);
    const data = await storageMock.get("usageHistory");
    assert.equal(data.usageHistory[0].cacheTokens, 25);
});

test("saveUsageStats - dailyStats incrementa el comptador del dia actual", async () => {
    clearStorage();
    const todayKey = new Date().toISOString().slice(0, 10);
    await saveUsageStats(100, 50, "summary", "gemini-2.0-flash", 1000, "T", "https://t.com");
    const data = await storageMock.get("dailyStats");
    assert.equal(data.dailyStats[todayKey], 1);
});

test("saveUsageStats - dailyStats acumula multiples resums del mateix dia", async () => {
    clearStorage();
    const todayKey = new Date().toISOString().slice(0, 10);
    await saveUsageStats(100, 50, "summary", "model-a", 1000, "A", "https://a.com");
    await saveUsageStats(200, 80, "summary", "model-b", 1200, "B", "https://b.com");
    await saveUsageStats(150, 60, "summary", "model-c", 900, "C", "https://c.com");
    const data = await storageMock.get("dailyStats");
    assert.equal(data.dailyStats[todayKey], 3);
});

test("saveUsageStats - dailyStats preserva comptadors d'altres dies", async () => {
    clearStorage();
    const todayKey = new Date().toISOString().slice(0, 10);
    const yesterdayKey = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
    await storageMock.set({ dailyStats: { [yesterdayKey]: 5 } });
    await saveUsageStats(100, 50, "summary", "model-a", 1000, "T", "https://t.com");
    const data = await storageMock.get("dailyStats");
    assert.equal(data.dailyStats[yesterdayKey], 5, "El comptador d'ahir s'ha de preservar");
    assert.equal(data.dailyStats[todayKey], 1, "El comptador d'avui ha de ser 1");
});
