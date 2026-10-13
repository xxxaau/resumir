// Estadístiques d'ús a la configuració: càlcul pur (computeUsageSummary) i la secció «Ús»
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadSettings } from "./helpers/settings-harness.mjs";

const require = createRequire(import.meta.url);
const { computeUsageSummary } = require("../options/settings-stats.js");

const NOW = new Date("2026-10-13T12:00:00Z");
const day = (n) => new Date(NOW.getTime() - n * 86400000).toISOString();
const HISTORY = [
    { date: day(0), model: "gemini-2.5-flash", inputTokens: 1000, outputTokens: 100, type: "summary", latency: 2000 },
    { date: day(0), model: "gemini-2.5-flash", inputTokens: 500, outputTokens: 50, type: "deepdive", latency: 4000 },
    { date: day(3), model: "gemini-3.1-flash-lite", inputTokens: 200, outputTokens: 20, type: "summary", latency: 1000 },
    { date: day(20), model: "gemini-3.1-flash-lite", inputTokens: 100, outputTokens: 10, type: "anki", latency: 3000 },
];

test("computeUsageSummary - totals, avui, 7 dies, tokens, temps mitjà, per tipus i per model", () => {
    const u = computeUsageSummary(HISTORY, { articles: 57, tokens: 12345 }, NOW);
    assert.equal(u.total, 57, "el total ve del comptador, que sobreviu a l'historial de 1000");
    assert.equal(u.today, 2);
    assert.equal(u.last7, 3);
    assert.equal(u.tokensIn, 1800);
    assert.equal(u.tokensOut, 180);
    assert.equal(u.avgLatencySec, 2.5);
    assert.deepEqual(u.byType.map(t => [t.type, t.count]), [["summary", 2], ["deepdive", 1], ["anki", 1]]);
    assert.deepEqual(u.byModel.map(m => [m.model, m.count]), [["gemini-2.5-flash", 2], ["gemini-3.1-flash-lite", 2]]);
});

test("computeUsageSummary - sense dades no peta i ho diu tot a zero", () => {
    const u = computeUsageSummary(undefined, undefined, NOW);
    assert.equal(u.total, 0);
    assert.equal(u.today, 0);
    assert.equal(u.avgLatencySec, null);
    assert.deepEqual(u.byType, []);
});

test("secció «Ús» - mostra les xifres de l'emmagatzematge", async () => {
    const h = await loadSettings({ local: { stats: { articles: 3, tokens: 1500 }, usageHistory: [
        { date: new Date().toISOString(), model: "gemini-2.5-flash", inputTokens: 1000, outputTokens: 100, type: "summary", latency: 2000 },
    ] } });
    try {
        const sec = h.document.getElementById("usageSection");
        assert.ok(sec);
        assert.match(sec.textContent, /3\s*resums|Resums generats[\s\S]*3/);
        assert.match(sec.textContent, /1\.000|1000/);
        assert.match(sec.textContent, /Resum/);
        assert.equal(h.document.getElementById("clearUsageStats").disabled, false);
    } finally { h.close(); }
});

test("secció «Ús» - sense dades diu que encara no n'hi ha i el botó d'esborrar queda inactiu", async () => {
    const h = await loadSettings({});
    try {
        assert.match(h.document.getElementById("usageSection").textContent, /Encara no hi ha dades/);
        assert.equal(h.document.getElementById("clearUsageStats").disabled, true);
    } finally { h.close(); }
});

test("secció «Ús» - esborrar demana confirmació, ho buida i ho diu", async () => {
    const h = await loadSettings({ local: { stats: { articles: 2, tokens: 10 }, usageHistory: [{ date: new Date().toISOString(), model: "m", inputTokens: 5, outputTokens: 5, type: "summary", latency: 1000 }], dailyStats: { "2026-10-13": 2 } }, confirmAnswer: true });
    try {
        h.document.getElementById("clearUsageStats").click();
        await h.flush(20);
        assert.equal(h.calls.confirms.length, 1);
        const left = await h.storage.local.get(["stats", "usageHistory", "dailyStats"]);
        assert.deepEqual(Object.values(left).filter(v => v !== undefined), [], "stats, usageHistory i dailyStats esborrats");
        assert.match(h.document.getElementById("usageSection").textContent, /Encara no hi ha dades/);
    } finally { h.close(); }
});

test("secció «Ús» - si es cancel·la la confirmació no s'esborra res", async () => {
    const h = await loadSettings({ local: { stats: { articles: 2, tokens: 10 }, usageHistory: [{ date: new Date().toISOString(), model: "m", inputTokens: 5, outputTokens: 5, type: "summary", latency: 1000 }] }, confirmAnswer: false });
    try {
        h.document.getElementById("clearUsageStats").click();
        await h.flush(20);
        assert.equal((await h.storage.local.get("stats")).stats.articles, 2);
    } finally { h.close(); }
});
