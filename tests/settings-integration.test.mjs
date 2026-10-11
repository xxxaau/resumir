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

// ---------------------------------------------------------------------------
// Regressió (0.10): els interruptors de plugins actualitzaven el menú lateral a
// l'instant però NO es desaven fins a «Desar»; tancar la pestanya els perdia.
// El desat automàtic ha d'escriure NOMÉS el que s'ha tocat.
// ---------------------------------------------------------------------------
test("interruptor de plugin - es desa a l'instant, sense prémer «Desar»", async () => {
    const h = await loadSettings({ sync: { enableDeepdive: false } });
    try {
        h.document.getElementById("enableDeepdive").click();
        await h.flush();
        const { enableDeepdive } = await h.storage.sync.get("enableDeepdive");
        assert.equal(enableDeepdive, true);
        assert.match(h.document.getElementById("status").textContent, /Desat/);
    } finally { h.close(); }
});

test("interruptor de plugin - NO commiteja prompts ni la clau a mig editar", async () => {
    const h = await loadSettings({ sync: { systemPrompt: "prompt desat" }, local: { apiKey: "AIza_desada" } });
    try {
        h.document.getElementById("systemPrompt").value = "edició a mig fer, sense desar";
        h.document.getElementById("apiKey").value = "AIza_a_mig_escriure";

        h.document.getElementById("enableMarkdown").click();
        await h.flush();

        const sync = await h.storage.sync.get(["systemPrompt", "enableMarkdown"]);
        const local = await h.storage.local.get("apiKey");
        assert.equal(sync.enableMarkdown, true, "L'interruptor sí que es desa");
        assert.equal(sync.systemPrompt, "prompt desat", "El prompt a mig editar no s'ha de desar");
        assert.equal(local.apiKey, "AIza_desada", "La clau a mig escriure no s'ha de desar");
    } finally { h.close(); }
});

test("canviar el tema es desa a l'instant", async () => {
    const h = await loadSettings({ sync: { theme: "light" } });
    try {
        const sel = h.document.getElementById("themeSelect");
        sel.value = "dark";
        sel.dispatchEvent(new h.window.Event("change", { bubbles: true }));
        await h.flush();
        const { theme } = await h.storage.sync.get("theme");
        assert.equal(theme, "dark");
    } finally { h.close(); }
});

test("moure un plugin amunt/avall desa l'ordre a l'instant", async () => {
    const h = await loadSettings({ sync: {} });
    try {
        const before = (await h.storage.sync.get("extensionOrder")).extensionOrder;
        const down = h.document.querySelector(".btn-move-down:not([disabled])");
        assert.ok(down, "Ha d'haver-hi un botó de baixar");
        down.click();
        await h.flush();
        const after = (await h.storage.sync.get("extensionOrder")).extensionOrder;
        assert.ok(Array.isArray(after) && after.length > 0, "S'ha de desar extensionOrder");
        assert.notDeepEqual(after, before, "L'ordre desat ha de canviar");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Selector de models (3.1): files i estrelles eren <span> només clicables: un
// usuari de teclat o de lector de pantalla no hi podia triar ni gestionar
// favorits; Esc no el tancava.
// ---------------------------------------------------------------------------
async function openModelPicker(h) {
    h.document.getElementById("checkModels").click();
    await h.flush();
    return h.document.getElementById("modelsList");
}

test("selector de models - estrelles i noms són botons reals, amb nom i estat", async () => {
    const h = await loadSettings({ sync: { favoriteModels: [] } });
    try {
        const list = await openModelPicker(h);
        const stars = [...list.querySelectorAll(".model-star")];
        assert.ok(stars.length > 0);
        for (const s of stars) {
            assert.equal(s.tagName, "BUTTON", "L'estrella ha de ser un <button>");
            assert.ok(s.hasAttribute("aria-pressed"), "Ha de dir si és favorit (aria-pressed)");
            assert.match(s.getAttribute("aria-label"), /favorits/, "Nom accessible amb el model");
        }
        assert.ok([...list.querySelectorAll(".model-name-btn")].every(b => b.tagName === "BUTTON"));
        assert.equal(h.document.getElementById("checkModels").getAttribute("aria-expanded"), "true");
    } finally { h.close(); }
});

test("selector de models - Esc el tanca i retorna el focus al botó", async () => {
    const h = await loadSettings({});
    try {
        const list = await openModelPicker(h);
        assert.equal(list.style.display, "block");
        h.document.dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        assert.equal(list.style.display, "none");
        const trigger = h.document.getElementById("checkModels");
        assert.equal(trigger.getAttribute("aria-expanded"), "false");
        assert.equal(h.document.activeElement, trigger);
    } finally { h.close(); }
});

test("selector de models - marcar una estrella desa el favorit i manté el focus a la mateixa estrella", async () => {
    const h = await loadSettings({ sync: { favoriteModels: [] } });
    try {
        const list = await openModelPicker(h);
        const first = list.querySelector(".model-star");
        const id = first.dataset.modelId;
        first.focus();
        first.click();
        await h.flush();
        const { favoriteModels } = await h.storage.sync.get("favoriteModels");
        assert.ok(favoriteModels.includes(id), "El favorit s'ha de desar");
        const again = [...h.document.querySelectorAll(".model-star")].find(b => b.dataset.modelId === id);
        assert.equal(again.getAttribute("aria-pressed"), "true");
        assert.equal(h.document.activeElement, again, "El focus no s'ha de perdre en re-renderitzar");
    } finally { h.close(); }
});

test("selector de models - triar un model omple el camp, tanca la llista i retorna el focus", async () => {
    const h = await loadSettings({});
    try {
        const list = await openModelPicker(h);
        const btn = list.querySelector(".model-name-btn");
        btn.click();
        assert.ok(h.document.getElementById("modelName").value.length > 0);
        assert.equal(list.style.display, "none");
        assert.equal(h.document.activeElement, h.document.getElementById("checkModels"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Formularis i feedback (6.1–6.3): ajuda associada al camp, toast com a regió
// d'estat i temporitzador que es reinicia.
// ---------------------------------------------------------------------------
test("l'ajuda de cada camp està associada amb aria-describedby", async () => {
    const h = await loadSettings({});
    try {
        const apiKey = h.document.getElementById("apiKey");
        const ids = (apiKey.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
        assert.ok(ids.length > 0, "#apiKey ha de tenir aria-describedby");
        const help = h.document.getElementById(ids[0]);
        assert.ok(help, "L'id referenciat ha d'existir");
        assert.match(help.textContent, /Necessària/);
        // Cap aria-describedby penja d'un id inexistent
        for (const el of h.document.querySelectorAll("[aria-describedby]")) {
            for (const id of el.getAttribute("aria-describedby").split(/\s+/)) {
                assert.ok(h.document.getElementById(id), `aria-describedby apunta a #${id}, que no existeix`);
            }
        }
    } finally { h.close(); }
});

test("el toast és una regió role=status sempre al DOM i buida de bon principi", async () => {
    const h = await loadSettings({});
    try {
        const st = h.document.getElementById("status");
        assert.equal(st.getAttribute("role"), "status");
        assert.equal(st.getAttribute("aria-live"), "polite");
        assert.equal(st.textContent, "", "Buit fins que hi ha un missatge (perquè se n'anunciï el canvi)");
        assert.ok(!st.classList.contains("show"));
    } finally { h.close(); }
});

test("el toast reinicia el temporitzador: el segon missatge no el pot amagar el primer", async () => {
    const h = await loadSettings({});
    try {
        const cleared = [];
        const realClear = h.window.clearTimeout.bind(h.window);
        h.window.clearTimeout = (id) => { cleared.push(id); realClear(id); };
        h.window.showStatus("primer");
        h.window.showStatus("segon");
        assert.ok(cleared.some(id => id !== undefined && id !== null),
            "Cal esborrar el temporitzador anterior en mostrar un missatge nou");
        const st = h.document.getElementById("status");
        assert.equal(st.textContent, "segon");
        assert.ok(st.classList.contains("show"));
    } finally { h.close(); }
});
