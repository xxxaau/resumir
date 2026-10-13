// Còpia de seguretat de la configuració: exportar/importar (JSON) amb validació estricta
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { loadSettings } from "./helpers/settings-harness.mjs";

const require = createRequire(import.meta.url);
const { buildConfigExport, parseConfigImport, CONFIG_EXPORT_KEYS } = require("../options/settings-backup.js");

test("exportar - només les claus de configuració conegudes; mai la clau d'API per defecte", () => {
    const out = buildConfigExport(
        { theme: "dark", sciencePrompt: "el meu", extensionOrder: ["resum"], sinopsi: "no és una clau nostra", deepDivePromptUpdateAvailable: true },
        { apiKey: "AIzaSyDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUM" },
        { includeKey: false, version: "9.9.9", now: new Date("2026-10-13T10:00:00Z") });
    assert.equal(out.app, "resumir");
    assert.equal(out.formatVersion, 1);
    assert.equal(out.extensionVersion, "9.9.9");
    assert.deepEqual(out.settings, { theme: "dark", sciencePrompt: "el meu", extensionOrder: ["resum"] });
    assert.equal(out.apiKey, undefined, "sense clau si no es demana");
    const withKey = buildConfigExport({}, { apiKey: "AIzaSyDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUM" }, { includeKey: true });
    assert.match(withKey.apiKey, /^AIza/);
});

test("importar - accepta un fitxer vàlid i diu què importa", () => {
    const text = JSON.stringify({ app: "resumir", formatVersion: 1, settings: { theme: "dark", sciencePrompt: "p", enableDeepdive: true } });
    const r = parseConfigImport(text);
    assert.equal(r.ok, true);
    assert.deepEqual(r.settings, { theme: "dark", sciencePrompt: "p", enableDeepdive: true });
    assert.deepEqual(r.customPrompts, ["sciencePrompt"]);
});

test("importar - rebutja el que no és de Resumir, JSON malformat o una versió de format futura", () => {
    assert.match(parseConfigImport("no és json").error, /JSON/);
    assert.match(parseConfigImport(JSON.stringify({ app: "altra", settings: {} })).error, /Resumir/);
    assert.match(parseConfigImport(JSON.stringify({ app: "resumir", formatVersion: 99, settings: {} })).error, /versi[óo]/i);
    assert.match(parseConfigImport(JSON.stringify({ app: "resumir", formatVersion: 1 })).error, /ajustos/);
});

test("importar - ignora claus desconegudes i valors de tipus equivocat; rebutja valors massa grans", () => {
    const big = "x".repeat(9000);
    const r = parseConfigImport(JSON.stringify({ app: "resumir", formatVersion: 1, settings: {
        theme: "dark", __proto__x: 1, hack: "<script>", enableAnki: "sí", bionicFixation: 40, systemPrompt: big, extensionOrder: ["resum", "pdf"],
    } }));
    assert.equal(r.ok, true);
    assert.deepEqual(Object.keys(r.settings).sort(), ["bionicFixation", "extensionOrder", "theme"]);
    assert.ok(r.ignored.includes("hack") && r.ignored.includes("enableAnki") && r.ignored.includes("systemPrompt"));
});

test("importar - la clau d'API només s'accepta si té forma de clau de Gemini", () => {
    const ok = parseConfigImport(JSON.stringify({ app: "resumir", formatVersion: 1, settings: {}, apiKey: "AIzaSyDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUM" }));
    assert.match(ok.apiKey, /^AIza/);
    const bad = parseConfigImport(JSON.stringify({ app: "resumir", formatVersion: 1, settings: { theme: "dark" }, apiKey: "<img onerror=x>" }));
    assert.equal(bad.apiKey, undefined);
    assert.ok(bad.ignored.includes("apiKey"));
});

test("les claus exportables no inclouen avisos d'actualització (són estat intern)", () => {
    assert.ok(!CONFIG_EXPORT_KEYS.some(k => /UpdateAvailable$/.test(k)));
    assert.ok(CONFIG_EXPORT_KEYS.includes("promptVersions"), "es manté la relació prompt↔versió per no fer saltar avisos falsos");
});

// ---------------------------------------------------------------------------
// Integració a la pàgina
// ---------------------------------------------------------------------------
test("pàgina - «Exportar» descarrega un JSON amb la configuració (sense clau per defecte)", async () => {
    const h = await loadSettings({ sync: { theme: "dark", sciencePrompt: "propi" }, local: { apiKey: "AIzaSyDUMMYDUMMYDUMMYDUMMYDUMMYDUMMYDUM" } });
    try {
        const blobs = [];
        h.window.URL.createObjectURL = (b) => { blobs.push(b); return "blob:test"; };
        h.window.URL.revokeObjectURL = () => {};
        const downloads = [];
        h.window.HTMLAnchorElement.prototype.click = function () { downloads.push(this.download); };
        h.document.getElementById("exportConfig").click();
        await h.flush(10);
        assert.equal(downloads.length, 1);
        assert.match(downloads[0], /^resumir-configuracio-\d{8}\.json$/);
        const text = await new Promise((res) => { const fr = new h.window.FileReader(); fr.onload = () => res(fr.result); fr.readAsText(blobs[0]); });
        const data = JSON.parse(text);
        assert.equal(data.settings.theme, "dark");
        assert.equal(data.apiKey, undefined);
    } finally { h.close(); }
});

test("pàgina - «Importar» valida, demana confirmació i aplica (sense tocar el que no hi és)", async () => {
    const h = await loadSettings({ sync: { theme: "light", modelName: "gemini-2.5-flash" }, confirmAnswer: true });
    try {
        const input = h.document.getElementById("importConfigFile");
        const file = new h.window.File([JSON.stringify({ app: "resumir", formatVersion: 1, settings: { theme: "dark", sciencePrompt: "importat" } })], "c.json", { type: "application/json" });
        Object.defineProperty(input, "files", { value: [file], configurable: true });
        input.dispatchEvent(new h.window.Event("change", { bubbles: true }));
        await h.flush(30);
        assert.equal(h.calls.confirms.length, 1);
        assert.match(h.calls.confirms[0], /1 prompt personalitzat|prompts? personalitzats?/i);
        const stored = await h.storage.sync.get(["theme", "sciencePrompt", "modelName"]);
        assert.equal(stored.theme, "dark");
        assert.equal(stored.sciencePrompt, "importat");
        assert.equal(stored.modelName, "gemini-2.5-flash", "el que no és al fitxer es conserva");
        assert.equal(h.document.getElementById("sciencePrompt").value, "importat", "la pàgina es refresca amb els valors nous");
    } finally { h.close(); }
});

test("pàgina - un fitxer invàlid o una confirmació cancel·lada no canvia res", async () => {
    const h = await loadSettings({ sync: { theme: "light" }, confirmAnswer: false });
    try {
        const input = h.document.getElementById("importConfigFile");
        const set = async (content) => {
            const file = new h.window.File([content], "c.json", { type: "application/json" });
            Object.defineProperty(input, "files", { value: [file], configurable: true });
            input.dispatchEvent(new h.window.Event("change", { bubbles: true }));
            await h.flush(30);
        };
        await set("{{{ no json");
        assert.equal(h.calls.confirms.length, 0, "ni demana confirmació");
        await set(JSON.stringify({ app: "resumir", formatVersion: 1, settings: { theme: "dark" } }));
        assert.equal(h.calls.confirms.length, 1);
        assert.equal((await h.storage.sync.get("theme")).theme, "light", "cancel·lat: no s'aplica");
    } finally { h.close(); }
});
