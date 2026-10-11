/**
 * tests/settings-integration.test.mjs
 * Tests d'integració de la pàgina de configuració real (jsdom).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSettings } from "./helpers/settings-harness.mjs";

test("harness - la configuració es carrega i omple els camps des d'storage", async () => {
    const h = await loadSettings({ sync: { modelName: "gemini-2.5-flash" }, local: { apiKey: "AIza_x" } });
    try {
        assert.equal(h.document.getElementById("apiKey").value, "AIza_x");
        assert.equal(h.document.getElementById("modelName").value, "gemini-2.5-flash");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.12): «Buidar memòria cau» esborra les claus summary_cache:*, que
// són l'historial de la barra lateral, i el diàleg no ho deia ni quantes eren.
// ---------------------------------------------------------------------------
function seedCache(n) {
    const local = { summary_cache_index: [] };
    for (let i = 0; i < n; i++) {
        const key = `summary_cache:https://e.com/${i}:summary`;
        local[key] = { url: `https://e.com/${i}`, title: `T${i}`, summary: "x", timestamp: new Date().toISOString(), type: "summary" };
        local.summary_cache_index.push(key);
    }
    return local;
}

test("buidar memòria cau - el diàleg diu que s'esborra l'historial i quants resums", async () => {
    const h = await loadSettings({ local: seedCache(3), confirmAnswer: false });
    try {
        h.document.getElementById("clearCache").click();
        await h.flush();
        assert.equal(h.calls.confirms.length, 1);
        assert.match(h.calls.confirms[0], /historial/i);
        assert.match(h.calls.confirms[0], /3 resums/);
        const keys = Object.keys(await h.storage.local.get(null)).filter(k => k.startsWith("summary_cache:"));
        assert.equal(keys.length, 3, "Si es cancel·la, no s'ha d'esborrar res");
    } finally { h.close(); }
});

test("buidar memòria cau - confirmant, esborra les entrades", async () => {
    const h = await loadSettings({ local: seedCache(2), confirmAnswer: true });
    try {
        h.document.getElementById("clearCache").click();
        await h.flush();
        const keys = Object.keys(await h.storage.local.get(null)).filter(k => k.startsWith("summary_cache:"));
        assert.equal(keys.length, 0);
    } finally { h.close(); }
});

test("buidar memòria cau - sense res desat no demana confirmació i ho diu", async () => {
    const h = await loadSettings({ local: {} });
    try {
        h.document.getElementById("clearCache").click();
        await h.flush();
        assert.equal(h.calls.confirms.length, 0);
        assert.match(h.document.getElementById("status").textContent, /No hi havia cap resum/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.11): desar QUALSEVOL pestanya posava a false els 4 avisos de
// «nova versió del prompt», també els de pestanyes que l'usuari no havia obert.
// ---------------------------------------------------------------------------
const ALL_UPDATE_FLAGS = {
    deepDivePromptUpdateAvailable: true,
    sciencePromptUpdateAvailable: true,
    conceptMapPromptUpdateAvailable: true,
    simplePromptUpdateAvailable: true,
};

test("desar la pestanya General no esborra cap avís de prompt nou", async () => {
    const h = await loadSettings({ sync: { ...ALL_UPDATE_FLAGS } });
    try {
        h.document.getElementById("save").click();
        await h.flush();
        const flags = await h.storage.sync.get(Object.keys(ALL_UPDATE_FLAGS));
        assert.deepEqual(flags, ALL_UPDATE_FLAGS);
    } finally { h.close(); }
});

test("desar la pestanya d'Aprofundiment només esborra el SEU avís", async () => {
    const h = await loadSettings({ sync: { ...ALL_UPDATE_FLAGS } });
    try {
        h.document.getElementById("saveDeepDive").click();
        await h.flush();
        const flags = await h.storage.sync.get(Object.keys(ALL_UPDATE_FLAGS));
        assert.equal(flags.deepDivePromptUpdateAvailable, false);
        assert.equal(flags.sciencePromptUpdateAvailable, true);
        assert.equal(flags.conceptMapPromptUpdateAvailable, true);
        assert.equal(flags.simplePromptUpdateAvailable, true);
    } finally { h.close(); }
});
