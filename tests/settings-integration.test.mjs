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

        h.document.getElementById("enableObsidian").click();
        await h.flush();

        const sync = await h.storage.sync.get(["systemPrompt", "enableObsidian"]);
        const local = await h.storage.local.get("apiKey");
        assert.equal(sync.enableObsidian, true, "L'interruptor sí que es desa");
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
        assert.ok(ids.every(id => h.document.getElementById(id)), "Els ids referenciats han d'existir");
        const described = ids.map(id => h.document.getElementById(id).textContent).join(" ");
        assert.match(described, /Necessària/);
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

// ---------------------------------------------------------------------------
// Pantalla General (2.4): la clau va abans del model, es pot comprovar sense
// fer un resum, es pot mostrar/amagar i es desa neta.
// ---------------------------------------------------------------------------
test("General - la clau d'API va ABANS del model (sense clau no es poden actualitzar els models)", async () => {
    const h = await loadSettings({});
    try {
        const pos = (id) => {
            const el = h.document.getElementById(id);
            return [...h.document.querySelectorAll("#tab-general input, #tab-general select")].indexOf(el);
        };
        assert.ok(pos("apiKey") > -1 && pos("modelName") > -1);
        assert.ok(pos("apiKey") < pos("modelName"));
        assert.equal(h.document.getElementById("apiKey").getAttribute("autocomplete"), "off");
        assert.equal(h.document.getElementById("modelName").placeholder, "gemini-3.1-flash-lite", "Placeholder = el model per defecte actual, no un d'obsolet");
    } finally { h.close(); }
});

test("General - mostrar/amagar la clau commuta el tipus, l'estat i el nom", async () => {
    const h = await loadSettings({ local: { apiKey: "AIzaX" } });
    try {
        const input = h.document.getElementById("apiKey");
        const btn = h.document.getElementById("toggleApiKey");
        btn.click();
        assert.equal(input.type, "text");
        assert.equal(btn.getAttribute("aria-pressed"), "true");
        assert.equal(btn.getAttribute("aria-label"), "Amagar la clau");
        btn.click();
        assert.equal(input.type, "password");
    } finally { h.close(); }
});

test("General - «Comprovar» valida i desa la clau (neta) sense prémer «Desar»", async () => {
    const h = await loadSettings({ fetchHandler: async () => ({ status: 200 }) });
    try {
        h.document.getElementById("apiKey").value = '  "Bearer AIza' + "z".repeat(35) + '"  ';
        // «Bearer» dins de cometes: es treuen les cometes i el prefix
        h.document.getElementById("verifyApiKey").click();
        await h.flush(15);
        const { apiKey } = await h.storage.local.get("apiKey");
        assert.equal(apiKey, "AIza" + "z".repeat(35));
        assert.equal(h.document.getElementById("apiKey").value, apiKey, "El camp mostra la clau neta");
        assert.match(h.document.getElementById("apiKeyStatus").textContent, /Clau vàlida i desada/);
        assert.equal(h.calls.fetches[0].headers["x-goog-api-key"], apiKey);
    } finally { h.close(); }
});

test("General - «Comprovar» amb una clau incorrecta NO la desa i diu què fer", async () => {
    const h = await loadSettings({ local: { apiKey: "AIza_antiga" }, fetchHandler: async () => ({ status: 400 }) });
    try {
        h.document.getElementById("apiKey").value = "AIzaMALA";
        h.document.getElementById("verifyApiKey").click();
        await h.flush(15);
        assert.match(h.document.getElementById("apiKeyStatus").textContent, /no és vàlida/);
        assert.equal((await h.storage.local.get("apiKey")).apiKey, "AIza_antiga", "No es sobreescriu la clau que ja funcionava");
        assert.equal(h.document.activeElement, h.document.getElementById("apiKey"));
    } finally { h.close(); }
});

test("General - «Desar» treu espais, cometes i «Bearer» de la clau", async () => {
    const h = await loadSettings({});
    try {
        h.document.getElementById("apiKey").value = "  Bearer AIzaSENSE  ";
        h.document.getElementById("save").click();
        await h.flush();
        assert.equal((await h.storage.local.get("apiKey")).apiKey, "AIzaSENSE");
    } finally { h.close(); }
});

test("General - la privadesa diu que el text de les pàgines s'envia a Google Gemini", async () => {
    const h = await loadSettings({});
    try {
        const text = h.document.getElementById("tab-general").textContent + h.document.getElementById("tab-data").textContent;
        assert.match(text, /s'envia a l'API de Google\s+Gemini/);
        assert.match(text, /només\s+en aquest navegador/, "La clau es desa només en aquest navegador");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Enllaços profunds (2.4): `#tab=<pestanya>&focus=<camp>`. La pàgina s'obria
// sempre a «General»; el sidebar no podia portar l'usuari al camp que calia.
// ---------------------------------------------------------------------------
const activeTab = (h) => h.document.querySelector(".tab-pane.active")?.id;

test("enllaç profund - #tab=deepdive obre la pestanya d'aprofundiment", async () => {
    const h = await loadSettings({ hash: "#tab=deepdive" });
    try {
        assert.equal(activeTab(h), "tab-deepdive");
    } finally { h.close(); }
});

test("enllaç profund - #tab=general&focus=apiKey enfoca el camp de la clau", async () => {
    const h = await loadSettings({ hash: "#tab=general&focus=apiKey" });
    try {
        assert.equal(activeTab(h), "tab-general");
        assert.equal(h.document.activeElement, h.document.getElementById("apiKey"));
    } finally { h.close(); }
});

test("enllaç profund - una pestanya inexistent o amb caràcters estranys s'ignora (queda a General)", async () => {
    for (const hash of ["#tab=no-existeix", "#tab=%3Cscript%3E", "#focus=../../x", ""]) {
        const h = await loadSettings({ hash });
        try {
            assert.equal(activeTab(h), "tab-general", `hash ${hash}`);
        } finally { h.close(); }
    }
});

test("enllaç profund - canviar de pestanya actualitza l'adreça (recarregar hi torna)", async () => {
    const h = await loadSettings({});
    try {
        h.document.querySelector('.nav-item[data-tab="about"]').click();
        assert.match(h.window.location.hash, /tab=about/);
    } finally { h.close(); }
});

test("enllaç profund - parseSettingsHash només accepta ids segurs", async () => {
    const h = await loadSettings({});
    try {
        // L'objecte ve d'un altre realm (jsdom): es compara per camps, no per prototip
        const p = (hash) => { const r = h.window.parseSettingsHash(hash); return { tab: r.tab, focus: r.focus }; };
        assert.deepEqual(p("#tab=anki&focus=ankiVault"), { tab: "anki", focus: "ankiVault" });
        assert.deepEqual(p("#tab=a b"), { tab: null, focus: null });
        assert.deepEqual(p(""), { tab: null, focus: null });
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Rutes de nota (2.4): els valors per defecte eren l'estructura de carpetes
// personal de l'autor i els tokens (gggg, ww…) no es podien descobrir.
// ---------------------------------------------------------------------------
test("rutes - els valors per defecte són neutres (no la carpeta personal de l'autor)", async () => {
    const h = await loadSettings({});
    try {
        assert.equal(h.document.getElementById("obsidianPath").value, "Resumir/YYYY-MM-DD");
        assert.equal(h.document.getElementById("ankiPath").value, "Resumir/Anki.md");
        assert.doesNotMatch(h.document.getElementById("tab-obsidian").textContent + h.document.getElementById("tab-anki").textContent,
            /4 Arxiu|3 Recursos/);
    } finally { h.close(); }
});

test("rutes - la vista prèvia mostra la ruta resolta amb la data d'avui i s'actualitza en escriure", async () => {
    const h = await loadSettings({});
    try {
        const preview = h.document.getElementById("obsidianPathPreview");
        assert.match(preview.textContent, /^Exemple: Resumir\/\d{4}-\d{2}-\d{2}\.md$/);

        const input = h.document.getElementById("obsidianPath");
        input.value = "[Notes/]YYYY/ww";
        input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        const year = String(new Date().getFullYear());
        assert.match(preview.textContent, new RegExp(`^Exemple: Notes/${year}/\\d{2}\\.md$`));
        assert.equal(preview.getAttribute("role"), "status");

        assert.match(h.document.getElementById("ankiPathPreview").textContent, /^Exemple: Resumir\/Anki\.md$/);
    } finally { h.close(); }
});

test("rutes - una ruta desada per l'usuari es respecta (no es trepitja amb el valor per defecte nou)", async () => {
    const h = await loadSettings({ sync: { obsidianPath: "[4 Arxiu/Notes/]YYYY/gggg-[W]ww", ankiPath: "3 Recursos/Anki.md" } });
    try {
        assert.equal(h.document.getElementById("obsidianPath").value, "[4 Arxiu/Notes/]YYYY/gggg-[W]ww");
        assert.equal(h.document.getElementById("ankiPath").value, "3 Recursos/Anki.md");
    } finally { h.close(); }
});

test("plantilla de Markdown - la configuració mostra la MATEIXA que fa servir la barra lateral", async () => {
    const h = await loadSettings({});
    try {
        assert.equal(h.document.getElementById("markdownTemplate").value, "# [{{title}}]({{url}})\n\n{{summary}}");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Selector de models (2.4): el camp mostrava l'ID cru i res deia què és cada
// model. Ara hi ha nom llegible, nivell i «Recomanat».
// ---------------------------------------------------------------------------
test("selector de models - sota el camp es veu el nom llegible, el nivell i «Recomanat»", async () => {
    const h = await loadSettings({ sync: { modelName: "gemini-3.1-flash-lite" } });
    try {
        const sum = h.document.getElementById("modelSummary");
        assert.ok(sum, "Ha d'existir #modelSummary");
        assert.match(sum.textContent, /Gemini 3\.1 Flash Lite/);
        assert.match(sum.textContent, /Ràpid i econòmic/);
        assert.match(sum.textContent, /Recomanat/);
        const input = h.document.getElementById("modelName");
        input.value = "gemini-2.5-pro";
        input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        assert.match(sum.textContent, /Màxima qualitat/);
        assert.doesNotMatch(sum.textContent, /Recomanat/);
        input.value = "model-inventat";
        input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        assert.match(sum.textContent, /model-inventat/, "Un ID desconegut es mostra tal qual");
    } finally { h.close(); }
});

test("selector de models - cada fila de la llista porta la seva insígnia de nivell", async () => {
    const h = await loadSettings({ sync: { favoriteModels: [] } });
    try {
        const list = await openModelPicker(h);
        const rows = [...list.querySelectorAll(".model-item-row")];
        assert.ok(rows.length > 0);
        assert.ok(rows.every(r => r.querySelector(".model-badge")), "Totes les files tenen insígnia");
        assert.equal(list.querySelectorAll(".model-badge.recommended").length, 1);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Navegació (2.4): el prompt principal només s'assolia des de l'engranatge del
// plugin Resum i «Sobre» quedava enmig. Ara «Resum» és fix i «Sobre» va al final.
// ---------------------------------------------------------------------------
test("navegació - «Resum» és una entrada fixa i «Sobre» l'última", async () => {
    const h = await loadSettings({ sync: { enableResum: false } });
    try {
        const items = [...h.document.querySelectorAll(".sidebar .nav-item")].map(b => b.dataset.tab);
        assert.deepEqual(items.slice(0, 3), ["general", "resum", "extensions"]);
        assert.equal(items[items.length - 1], "about");
        assert.equal(items[items.length - 2], "data", "«Dades i privadesa» abans de «Sobre»");
        assert.equal(items.filter(t => t === "resum").length, 1, "No es duplica a «Plugins actius»");
        h.document.querySelector('.nav-item[data-tab="resum"]').click();
        assert.ok(h.document.getElementById("tab-resum").classList.contains("active"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Desat (2.4): un prompt massa gran feia fallar TOT el desat amb «Error guardant
// configuració» sense dir quin camp ni quant ocupava; i tancar la pàgina amb
// text editat sense desar el perdia sense avís.
// ---------------------------------------------------------------------------
test("desar - si un camp supera la quota diu quin és i quant ocupa", async () => {
    const h = await loadSettings({});
    try {
        h.storage.sync.set = async () => { throw new Error("QUOTA_BYTES_PER_ITEM quota exceeded"); };
        h.document.getElementById("systemPrompt").value = "x".repeat(9000);
        h.document.getElementById("saveCustom").click();
        await h.flush();
        const msg = h.document.getElementById("status").textContent;
        assert.match(msg, /Instruccions de l'assistent/, "Nomena el camp");
        assert.match(msg, /8\s?KB/, "Diu el màxim per camp");
        assert.match(msg, /[89][.,]\d KB/, "Diu la mida actual");
    } finally { h.close(); }
});

test("canvis sense desar - editar un text mostra l'avís i desar-lo l'amaga", async () => {
    const h = await loadSettings({});
    try {
        const note = h.document.getElementById("dirtyNote");
        assert.ok(note, "Ha d'existir #dirtyNote");
        assert.ok(note.hidden, "Amagat al principi");
        const ta = h.document.getElementById("systemPrompt");
        ta.value = ta.value + " canvi";
        ta.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        assert.equal(note.hidden, false);
        const ev = new h.window.Event("beforeunload", { cancelable: true });
        h.window.dispatchEvent(ev);
        assert.equal(ev.defaultPrevented, true, "Tancar amb canvis pendents demana confirmació");
        h.document.getElementById("saveCustom").click();
        await h.flush();
        assert.ok(note.hidden, "Desat: ja no hi ha canvis pendents");
        const ev2 = new h.window.Event("beforeunload", { cancelable: true });
        h.window.dispatchEvent(ev2);
        assert.equal(ev2.defaultPrevented, false);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// «Restaurar» (2.4): sobreescrivia el prompt personalitzat sense avís ni volta
// enrere. Ara marca canvis pendents i ofereix «Desfer».
// ---------------------------------------------------------------------------
test("restaurar - ofereix «Desfer» que recupera el text personalitzat", async () => {
    const h = await loadSettings({});
    try {
        const ta = h.document.getElementById("systemPrompt");
        ta.value = "el meu prompt personalitzat";
        h.document.getElementById("resetSystemPrompt").click();
        assert.notEqual(ta.value, "el meu prompt personalitzat", "Restaura el valor per defecte");
        assert.equal(h.document.getElementById("dirtyNote").hidden, false, "Queda pendent de desar");
        const undo = h.document.querySelector("#status button");
        assert.ok(undo, "El toast porta un botó Desfer");
        assert.match(undo.textContent, /Desfer/);
        undo.click();
        assert.equal(ta.value, "el meu prompt personalitzat");
    } finally { h.close(); }
});

test("restaurar - si ja era el valor per defecte no fa soroll", async () => {
    const h = await loadSettings({});
    try {
        h.document.getElementById("resetSystemPrompt").click();
        assert.equal(h.document.querySelector("#status button"), null);
        assert.equal(h.document.getElementById("dirtyNote").hidden, true);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Prompts (2.4): un prompt buit es podia desar i deixava l'extensió sense
// instruccions; i no es veia quins prompts estaven modificats.
// ---------------------------------------------------------------------------
test("desar - un prompt buit es bloqueja, enfoca el camp i no escriu res", async () => {
    const h = await loadSettings({});
    try {
        let writes = 0;
        const orig = h.storage.sync.set;
        h.storage.sync.set = async (...a) => { writes++; return orig(...a); };
        const ta = h.document.getElementById("deepDivePrompt");
        ta.value = "   ";
        h.document.getElementById("saveDeepDive").click();
        await h.flush();
        assert.equal(writes, 0);
        assert.match(h.document.getElementById("status").textContent, /Prompt d'aprofundiment.*buit/);
        assert.equal(h.document.activeElement, ta);
    } finally { h.close(); }
});

test("prompts - la insígnia «Personalitzat» apareix només si el text difereix del per defecte", async () => {
    const h = await loadSettings({});
    try {
        const badge = h.document.getElementById("systemPromptBadge");
        assert.ok(badge, "Ha d'existir #systemPromptBadge");
        assert.equal(badge.hidden, true);
        const ta = h.document.getElementById("systemPrompt");
        ta.value = ta.value + " extra";
        ta.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        assert.equal(badge.hidden, false);
        assert.match(badge.textContent, /Personalitzat/);
        h.document.getElementById("resetSystemPrompt").click();
        assert.equal(badge.hidden, true, "Restaurar la fa desaparèixer");
    } finally { h.close(); }
});

test("desar - un prompt igual al default no es desa (no es congela amb el text antic)", async () => {
    const h = await loadSettings({ sync: { systemPrompt: "vell", sciencePrompt: "editat" } });
    try {
        // El camp de Resum es restaura al default; el de Ciència queda editat
        h.document.querySelector("#resetSystemPrompt").click();
        await h.flush(10);
        h.document.querySelector("#sciencePrompt").value = "editat";
        h.document.querySelector("#saveCustom").click();
        await h.flush(20);
        const stored = await h.storage.sync.get(["systemPrompt", "sciencePrompt"]);
        assert.equal(stored.systemPrompt, undefined, "el default no es desa");
        assert.equal(stored.sciencePrompt, "editat", "l'edició es conserva");
    } finally { h.close(); }
});

test("estil del resum - els selectors es desen, es restauren i marquen canvis sense desar", async () => {
    const h = await loadSettings({ sync: { summaryFormat: "prose", summaryLength: "long" } });
    try {
        assert.equal(h.document.querySelector("#summaryFormat").value, "prose");
        assert.equal(h.document.querySelector("#summaryLength").value, "long");
        const sel = h.document.querySelector("#summaryLength");
        sel.value = "short";
        sel.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        assert.ok(!h.document.getElementById("dirtyNote").hidden, "el select ha de marcar canvis pendents");
        h.document.querySelector("#saveCustom").click();
        await h.flush(20);
        const stored = await h.storage.sync.get(["summaryFormat", "summaryLength"]);
        assert.equal(stored.summaryLength, "short");
        assert.equal(stored.summaryFormat, "prose");
    } finally { h.close(); }
});

test("actualitzar models sense clau - missatge al costat del camp, sense alert()", async () => {
    const h = await loadSettings({});
    try {
        let alerted = false;
        h.window.alert = () => { alerted = true; };
        h.document.querySelector("#refreshModels").click();
        await h.flush(10);
        assert.equal(alerted, false);
        assert.match(h.document.getElementById("refreshModelsStatus").textContent, /Primer introdueix la clau/);
    } finally { h.close(); }
});

test("desar - el missatge és «Desat.»", async () => {
    const h = await loadSettings({});
    try {
        h.document.querySelector("#saveCustom").click();
        await h.flush(20);
        assert.match(h.document.getElementById("status").textContent, /^Desat\./);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Lectura biònica: vista prèvia en directe i «Restaurar» amb «Desfer»
// ---------------------------------------------------------------------------
test("biònica - la vista prèvia reflecteix fixació, gruix i mida en directe", async () => {
    const h = await loadSettings({ sync: { bionicFixation: 50, bionicWeight: "800", bionicFontSize: "1.4em" } });
    try {
        const prev = h.document.getElementById("bionicPreview");
        assert.ok(prev.querySelector("b"), "ha de tenir paraules ressaltades");
        // «lectura» (7 lletres) al 50 % → ceil(3.5) = 4 lletres ressaltades
        const bolds = [...prev.querySelectorAll("b")].map(b => b.textContent);
        assert.ok(bolds.includes("lect"), `esperat «lect» a ${JSON.stringify(bolds)}`);
        assert.equal(prev.style.getPropertyValue("--bionic-weight"), "800");

        const slider = h.document.getElementById("bionicFixation");
        slider.value = "20";
        slider.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        const after = [...prev.querySelectorAll("b")].map(b => b.textContent);
        assert.ok(after.includes("le"), `al 20 % «lectura» → «le» (ceil(1.4)=2): ${JSON.stringify(after)}`);
    } finally { h.close(); }
});

test("biònica - Restaurar es pot desfer", async () => {
    const h = await loadSettings({ sync: { bionicFixation: 60, bionicWeight: "800" } });
    try {
        h.document.querySelector("#resetBionic").click();
        await h.flush(5);
        assert.equal(h.document.getElementById("bionicFixation").value, "20");
        h.document.querySelector("#status .toast-action").click();
        assert.equal(h.document.getElementById("bionicFixation").value, "60");
        assert.equal(h.document.getElementById("bionicWeight").value, "800");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Pestanyes de plugin: capçalera comuna («← Plugins», interruptor, estat) i camí
// de tornada també per als plugins desactivats
// ---------------------------------------------------------------------------
test("pestanya de plugin - capçalera amb enllaç a Plugins i interruptor lligat al de la targeta", async () => {
    const h = await loadSettings({ sync: { enableDeepdive: false } });
    try {
        // Un plugin desactivat no té enllaç al menú: s'hi arriba amb l'engranatge
        h.document.querySelector('[data-target="deepdive"]').click();
        await h.flush(5);
        const pane = h.document.getElementById("tab-deepdive");
        assert.ok(pane.classList.contains("active"));
        const head = pane.querySelector(".plugin-head");
        assert.ok(head, "capçalera de plugin");
        const state = head.querySelector(".plugin-state");
        assert.match(state.textContent, /Inactiu/);
        // El menú no es queda sense cap element actiu: marca «Plugins»
        assert.equal(h.document.querySelector('.nav-item[data-tab="extensions"]').getAttribute("aria-current"), "page");

        const toggle = head.querySelector('input[type="checkbox"]');
        toggle.checked = true;
        toggle.dispatchEvent(new h.window.Event("change", { bubbles: true }));
        await h.flush(10);
        assert.equal(h.document.getElementById("enableDeepdive").checked, true, "mou l'interruptor de la targeta");
        assert.match(state.textContent, /^Actiu/);
        const stored = await h.storage.sync.get("enableDeepdive");
        assert.equal(stored.enableDeepdive, true, "es desa com l'interruptor de la targeta");

        head.querySelector(".plugin-back").click();
        await h.flush(5);
        assert.ok(h.document.getElementById("tab-extensions").classList.contains("active"));
    } finally { h.close(); }
});

test("Markdown/Copiar - marcat per defecte; desmarcat només si l'usuari el va desactivar", async () => {
    const h1 = await loadSettings({});
    try { assert.equal(h1.document.getElementById("enableMarkdown").checked, true); } finally { h1.close(); }
    const h2 = await loadSettings({ sync: { enableMarkdown: false } });
    try { assert.equal(h2.document.getElementById("enableMarkdown").checked, false); } finally { h2.close(); }
});

// ---------------------------------------------------------------------------
// Revelació progressiva: els prompts, plegats sota «Personalitzar (avançat)»
// ---------------------------------------------------------------------------
test("prompts plegats per defecte; s'obren si estan personalitzats o en arribar-hi per enllaç", async () => {
    const h = await loadSettings({ sync: { sciencePrompt: "el meu prompt" } });
    try {
        const d = (id) => h.document.getElementById(id + "Details");
        assert.equal(d("systemPrompt").open, false, "per defecte, plegat");
        assert.equal(d("sciencePrompt").open, true, "personalitzat: obert perquè es vegi la insígnia");

        // Editar-lo a mà el deixa personalitzat → s'obre (no es pot perdre de vista)
        const area = h.document.getElementById("simplePrompt");
        area.value = "una altra cosa";
        area.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        assert.equal(d("simplePrompt").open, true);

        // Enllaç profund al camp: s'obre i s'hi enfoca
        h.window.location.hash = "#tab=deepdive&focus=deepDivePrompt";
        h.window.dispatchEvent(new h.window.Event("hashchange"));
        await h.flush(5);
        assert.equal(d("deepDivePrompt").open, true);
        assert.equal(h.document.activeElement.id, "deepDivePrompt");
    } finally { h.close(); }
});

test("avís de prompt nou - Resum i Anki mostren el seu bàner i «Mantenir» el descarta", async () => {
    const h = await loadSettings({ sync: {
        systemPrompt: "propi", systemPromptUpdateAvailable: true, systemPromptCustomized: true,
        ankiPrompt: "propi anki", ankiPromptUpdateAvailable: true, ankiPromptCustomized: true,
    } });
    try {
        const resum = h.document.getElementById("systemUpdateBanner");
        const anki = h.document.getElementById("ankiUpdateBanner");
        assert.ok(resum && resum.style.display !== "none", "bàner de Resum");
        assert.ok(anki && anki.style.display !== "none", "bàner d'Anki");
        resum.querySelector('[data-banner-action="dismiss"]').click();
        await h.flush(10);
        assert.equal(resum.style.display, "none");
        const stored = await h.storage.sync.get(["systemPromptUpdateAvailable", "ankiPromptUpdateAvailable"]);
        assert.equal(stored.systemPromptUpdateAvailable, false);
        assert.equal(stored.ankiPromptUpdateAvailable, true, "no toca el d'Anki");
    } finally { h.close(); }
});

test("avís de prompt nou - desar Resum només neteja SEU avís i marca el flag de personalitzat", async () => {
    const h = await loadSettings({ sync: { systemPromptUpdateAvailable: true, ankiPromptUpdateAvailable: true } });
    try {
        h.document.getElementById("systemPrompt").value = "una versió meva";
        h.document.querySelector("#saveCustom").click();
        await h.flush(20);
        const stored = await h.storage.sync.get(["systemPromptUpdateAvailable", "ankiPromptUpdateAvailable", "systemPromptCustomized"]);
        assert.equal(stored.systemPromptUpdateAvailable, false);
        assert.equal(stored.ankiPromptUpdateAvailable, true);
        assert.equal(stored.systemPromptCustomized, true);
    } finally { h.close(); }
});

test("prompt desat per una versió antiga (default retirat) - es mostra el default actual, sense «Personalitzat»", async () => {
    const { readFileSync } = await import("node:fs");
    // Default d'aprofundiment de v2.3.1: el literal que desava «Desar» i que avui és un default retirat
    const OLD_DEEP = readFileSync(new URL("./fixtures/legacy-deepdive-prompt-v2.3.1.txt", import.meta.url), "utf8");
    const h = await loadSettings({ sync: { deepDivePrompt: OLD_DEEP } });
    try {
        const area = h.document.getElementById("deepDivePrompt");
        assert.notEqual(area.value, OLD_DEEP, "no ha de mostrar el text antic");
        assert.ok(h.document.getElementById("deepDivePromptBadge").hidden, "ni marcar-lo com a personalitzat");
    } finally { h.close(); }
});

test("avís de prompt nou - «Restaurar» amaga el bàner però no descarta el flag fins a desar", async () => {
    const h = await loadSettings({ sync: { deepDivePrompt: "propi", deepDivePromptUpdateAvailable: true, deepDivePromptCustomized: true } });
    try {
        h.document.getElementById("resetDeepDive").click();
        await h.flush(10);
        assert.equal(h.document.getElementById("deepdiveUpdateBanner").style.display, "none");
        const stored = await h.storage.sync.get("deepDivePromptUpdateAvailable");
        assert.equal(stored.deepDivePromptUpdateAvailable, true, "no es persisteix fins que l'usuari desa");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Anki: «fer servir el vault d'Obsidian» per defecte; camp propi només si es desmarca
// ---------------------------------------------------------------------------
test("Anki - per defecte usa el vault d'Obsidian: casella marcada, camp amagat i es desa buit", async () => {
    const h = await loadSettings({ sync: { obsidianVault: "Notes" } });
    try {
        const box = h.document.getElementById("ankiUseObsidianVault");
        assert.equal(box.checked, true);
        assert.equal(h.document.getElementById("ankiVaultField").hidden, true);
        h.document.querySelector("#saveAnki").click();
        await h.flush(20);
        assert.equal((await h.storage.sync.get("ankiVault")).ankiVault, "", "buit = el d'Obsidian");
    } finally { h.close(); }
});

test("Anki - un vault propi (diferent del d'Obsidian) deixa la casella desmarcada i el camp visible", async () => {
    const h = await loadSettings({ sync: { obsidianVault: "Notes", ankiVault: "Estudi" } });
    try {
        assert.equal(h.document.getElementById("ankiUseObsidianVault").checked, false);
        assert.equal(h.document.getElementById("ankiVaultField").hidden, false);
        assert.equal(h.document.getElementById("ankiVault").value, "Estudi");
        // un valor igual al d'Obsidian equival a «el mateix»
        const h2 = await loadSettings({ sync: { obsidianVault: "Notes", ankiVault: "Notes" } });
        try { assert.equal(h2.document.getElementById("ankiUseObsidianVault").checked, true); } finally { h2.close(); }
    } finally { h.close(); }
});

test("Anki - desmarcar la casella mostra el camp i es desa el vault propi", async () => {
    const h = await loadSettings({ sync: { obsidianVault: "Notes" } });
    try {
        const box = h.document.getElementById("ankiUseObsidianVault");
        box.checked = false;
        box.dispatchEvent(new h.window.Event("change", { bubbles: true }));
        assert.equal(h.document.getElementById("ankiVaultField").hidden, false);
        h.document.getElementById("ankiVault").value = "Altre";
        h.document.querySelector("#saveAnki").click();
        await h.flush(20);
        assert.equal((await h.storage.sync.get("ankiVault")).ankiVault, "Altre");
    } finally { h.close(); }
});

test("Anki - l'enllaç profund al camp del vault el mostra encara que la casella estigui marcada", async () => {
    const h = await loadSettings({});
    try {
        h.window.location.hash = "#tab=anki&focus=ankiVault";
        h.window.dispatchEvent(new h.window.Event("hashchange"));
        await h.flush(5);
        assert.equal(h.document.getElementById("ankiUseObsidianVault").checked, false);
        assert.equal(h.document.activeElement.id, "ankiVault");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Focus als subpanells de configuració: entra a l'encapçalament i torna al disparador
// ---------------------------------------------------------------------------
test("subpanell de plugin - l'engranatge porta el focus al títol i «← Plugins» el torna a l'engranatge", async () => {
    const h = await loadSettings({});
    try {
        const gear = h.document.querySelector('.btn-icon[data-target="science"]');
        gear.focus();
        gear.click();
        await h.flush(5);
        const title = h.document.querySelector("#tab-science .page-title");
        assert.equal(h.document.activeElement, title, "el focus entra al títol del subpanell");
        h.document.querySelector("#tab-science .plugin-back").click();
        await h.flush(5);
        assert.equal(h.document.activeElement, gear, "i torna a l'engranatge que l'havia obert");
    } finally { h.close(); }
});

test("YouTube - els idiomes preferits de les transcripcions es poden escriure a Resum (i es desen com a llista neta)", async () => {
    const h = await loadSettings({ sync: { youtubePreferredLangs: ["ca", "es"] } });
    try {
        const input = h.document.getElementById("youtubePreferredLangs");
        assert.equal(input.value, "ca, es");
        input.value = " es , EN,, pt-BR ";
        h.document.querySelector("#saveCustom").click();
        await h.flush(20);
        const stored = (await h.storage.sync.get("youtubePreferredLangs")).youtubePreferredLangs;
        assert.equal(JSON.stringify(stored), JSON.stringify(["es", "en", "pt-BR"]), "minúscules i sense buits (els codis invàlids ja es rebutgen en desar)");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Reordenar plugins: el focus no es perd i es diu la posició nova
// ---------------------------------------------------------------------------
test("reordenar - en pujar un plugin el focus continua al seu botó i s'anuncia la posició", async () => {
    const h = await loadSettings({});
    try {
        const upBtn = (id) => h.document.querySelector(`.extension-actions[data-extension-id="${id}"] .btn-move-up`);
        const third = h.document.querySelectorAll(".extension-item")[2].querySelector(".extension-actions").dataset.extensionId;
        upBtn(third).focus();
        upBtn(third).click();
        await h.flush(5);
        assert.equal(h.document.activeElement, upBtn(third), "el focus no ha de caure a <body> en moure l'element");
        assert.match(h.document.getElementById("reorderStatus").textContent, /posició 2 de \d+/);
    } finally { h.close(); }
});

test("reordenar - en arribar a un extrem, el focus passa al botó contrari (no al botó inhabilitat)", async () => {
    const h = await loadSettings({});
    try {
        const first = h.document.querySelector(".extension-item .extension-actions").dataset.extensionId;
        const second = h.document.querySelectorAll(".extension-item")[1].querySelector(".extension-actions").dataset.extensionId;
        const up = (id) => h.document.querySelector(`.extension-actions[data-extension-id="${id}"] .btn-move-up`);
        const down = (id) => h.document.querySelector(`.extension-actions[data-extension-id="${id}"] .btn-move-down`);
        up(second).focus();
        up(second).click();                   // ara «second» és el primer
        await h.flush(5);
        assert.equal(up(second).disabled, true);
        assert.equal(h.document.activeElement, down(second), "el focus va a «avall», que és el que té sentit");
        void first;
    } finally { h.close(); }
});

test("reordenar - en baixar un plugin el focus també es manté", async () => {
    const h = await loadSettings({});
    try {
        const first = h.document.querySelector(".extension-item .extension-actions").dataset.extensionId;
        const down = h.document.querySelector(`.extension-actions[data-extension-id="${first}"] .btn-move-down`);
        down.focus();
        down.click();
        await h.flush(5);
        assert.equal(h.document.activeElement, down);
        assert.match(h.document.getElementById("reorderStatus").textContent, /posició 2 de \d+/);
    } finally { h.close(); }
});

test("avís de prompt nou - «Restaurar» desa NOMÉS aquell prompt, no els canvis a mig fer d'altres camps", async () => {
    const h = await loadSettings({ sync: { systemPrompt: "propi", systemPromptUpdateAvailable: true, systemPromptCustomized: true } });
    try {
        h.document.getElementById("deepDivePrompt").value = "a mig escriure, sense desar";
        h.document.querySelector('#systemUpdateBanner [data-banner-action="reset"]').click();
        await h.flush(20);
        const stored = await h.storage.sync.get(null);
        assert.equal(stored.systemPrompt, undefined, "el prompt propi s'esborra (torna al default)");
        assert.equal(stored.systemPromptUpdateAvailable, false);
        assert.equal(stored.systemPromptCustomized, false);
        assert.equal(stored.deepDivePrompt, undefined, "l'altre camp no s'ha desat");
        assert.equal(h.document.getElementById("systemUpdateBanner").style.display, "none");
        assert.ok(h.document.getElementById("systemPrompt").value.length > 50, "el camp mostra el default");
    } finally { h.close(); }
});

test("capçalera de plugin - l'interruptor porta el nom del plugin a l'aria-label (no un «aquest plugin» genèric)", async () => {
    const h = await loadSettings();
    try {
        const label = h.document.querySelector("#tab-anki .plugin-head input[type=checkbox]").getAttribute("aria-label");
        assert.equal(label, "Activa Targetes Anki");
    } finally { h.close(); }
});

test("pàgines de plugin - l'ajuda surt tancada, Resum no porta «← Plugins» ni interruptor i el prompt únic té Desar/Restaurar dins del desplegable", async () => {
    const h = await loadSettings();
    try {
        for (const d of h.document.querySelectorAll(".plugin-about")) assert.equal(d.hasAttribute("open"), false, "ajuda tancada");
        assert.equal(h.document.querySelector("#tab-resum .plugin-head"), null, "Resum és el nucli");
        assert.ok(h.document.querySelector("#tab-deepdive .plugin-head"), "els altres plugins sí");
        for (const [tab, btn] of [["deepdive", "saveDeepDive"], ["science", "saveScience"], ["conceptmap", "saveConceptMap"], ["simple", "saveSimple"]]) {
            const b = h.document.querySelector(`#tab-${tab} #${btn}`);
            assert.ok(b, `${btn} existeix`);
            assert.ok(b.closest("details.advanced-prompt"), `${btn} dins del desplegable del prompt`);
        }
    } finally { h.close(); }
});

test("«Restaurar» amb el prompt ja per defecte ho diu, no es queda mut", async () => {
    const h = await loadSettings();
    try {
        h.document.getElementById("resetDeepDive").click();
        await h.flush?.(10);
        assert.match(h.document.getElementById("status").textContent, /ja és el valor per defecte/);
    } finally { h.close(); }
});

test("desar - un valor fora de rang no es desa i porta al camp (no «Desat.» en fals)", async () => {
    const h = await loadSettings();
    try {
        h.document.getElementById("ankiPacket").value = "50";
        h.document.getElementById("saveAnki").click();
        await h.flush?.(10);
        const st = h.document.getElementById("status").textContent;
        assert.match(st, /entre 1 i 20/);
        assert.doesNotMatch(st, /Desat/);
        assert.equal(h.document.getElementById("ankiPacket").getAttribute("aria-invalid"), "true");
        assert.equal(h.document.activeElement.id, "ankiPacket");
        assert.equal((await h.storage.sync.get("ankiPacket")).ankiPacket, undefined, "no s'ha desat");
    } finally { h.close(); }
});

test("desar - uns idiomes il·legibles es diuen, no es buiden en silenci", async () => {
    const h = await loadSettings();
    try {
        h.document.getElementById("youtubePreferredLangs").value = "català, es";
        h.document.getElementById("save").click();
        await h.flush?.(10);
        assert.match(h.document.getElementById("status").textContent, /No reconec «català»/);
        assert.equal((await h.storage.sync.get("youtubePreferredLangs")).youtubePreferredLangs, undefined);
    } finally { h.close(); }
});

test("desar - un prompt buit d'una altra pestanya porta a aquella pestanya i n'obre el desplegable", async () => {
    const h = await loadSettings();
    try {
        const ta = h.document.getElementById("deepDivePrompt");
        ta.value = "  ";
        h.document.getElementById("save").click(); // «Desar» de General
        await h.flush?.(10);
        assert.ok(h.document.getElementById("tab-deepdive").classList.contains("active"), "mostra la pestanya del camp");
        assert.equal(h.document.getElementById("deepDivePromptDetails").open, true);
        assert.equal(h.document.activeElement.id, "deepDivePrompt");
        assert.match(h.document.getElementById("status").textContent, /no pot estar buit/);
    } finally { h.close(); }
});

test("plugins - la llista té els grups de la barra d'eines i només es reordena dins de cada grup", async () => {
    const h = await loadSettings({ sync: { extensionOrder: ["resum", "selectpdf", "obsidian", "simple", "markdown", "deepdive", "bionic", "science", "conceptmap", "anki"] } });
    try {
        const titles = [...h.document.querySelectorAll("#tab-extensions .extension-group-title")].map(t => t.textContent);
        assert.deepEqual(titles, ["Generar", "Exportar", "Vista"]);
        const ids = (g) => [...h.document.querySelectorAll(`.extension-group[data-group="${g}"] .extension-actions`)].map(a => a.dataset.extensionId);
        // L'ordre desat barreja grups: dins de cada grup es manté, entre grups mana la barra d'eines
        assert.deepEqual(ids("Generar"), ["resum", "selectpdf", "simple", "deepdive", "science", "conceptmap", "anki"]);
        assert.deepEqual(ids("Exportar"), ["obsidian", "markdown"]);
        assert.deepEqual(ids("Vista"), ["bionic"]);
        const btn = (id, dir) => h.document.querySelector(`.extension-actions[data-extension-id="${id}"] .btn-move-${dir}`);
        assert.equal(btn("obsidian", "up").disabled, true, "primer del seu grup");
        assert.equal(btn("markdown", "down").disabled, true, "últim del seu grup");
        assert.equal(btn("bionic", "up").disabled && btn("bionic", "down").disabled, true, "sol al seu grup");
        btn("markdown", "up").click();
        await h.flush(5);
        assert.deepEqual(ids("Exportar"), ["markdown", "obsidian"]);
        assert.deepEqual(ids("Generar").length, 7, "no travessa grups");
    } finally { h.close(); }
});

test("Dades i privadesa - historial, ús i còpia de seguretat són a la seva pestanya (General en queda lleugera) i la casella de la clau va abans dels botons", async () => {
    const h = await loadSettings();
    try {
        const data = h.document.getElementById("tab-data");
        for (const id of ["clearCache", "usageSection", "exportConfig", "importConfig", "exportIncludeKey"]) {
            assert.ok(data.querySelector("#" + id), `${id} a «Dades i privadesa»`);
            assert.equal(h.document.querySelector("#tab-general #" + id), null, `${id} ja no és a General`);
        }
        const pos = (id) => [...data.querySelectorAll("input, button")].indexOf(data.querySelector("#" + id));
        assert.ok(pos("exportIncludeKey") < pos("exportConfig"), "la casella va abans d'«Exportar»");
        assert.ok(h.document.querySelector('.nav-item[data-tab="data"]'));
    } finally { h.close(); }
});

test("navegació - en canviar de pestanya, l'entrada activa del menú es porta a la vista (menú horitzontal en pantalles estretes)", async () => {
    const h = await loadSettings();
    try {
        const seen = [];
        h.window.HTMLElement.prototype.scrollIntoView = function () { seen.push(this.dataset.tab); };
        h.document.querySelector('.nav-item[data-tab="about"]').click();
        assert.deepEqual(seen, ["about"]);
    } finally { h.close(); }
});

test("barra de canvis pendents - «Desar» desa i «Descartar» torna al valor desat", async () => {
    const h = await loadSettings({ sync: { obsidianVault: "Vell" } });
    try {
        const vault = h.document.getElementById("obsidianVault");
        const input = (v) => { vault.value = v; vault.dispatchEvent(new h.window.Event("input", { bubbles: true })); };
        input("Nou");
        const bar = h.document.getElementById("dirtyNote");
        assert.equal(bar.hidden, false);
        h.document.getElementById("dirtyDiscard").click();
        await h.flush(20);
        assert.equal(vault.value, "Vell", "descartat");
        assert.equal(bar.hidden, true);
        input("Nou");
        h.document.getElementById("dirtySave").click();
        await h.flush(20);
        assert.equal((await h.storage.sync.get("obsidianVault")).obsidianVault, "Nou", "desat des de la barra");
        assert.equal(bar.hidden, true);
    } finally { h.close(); }
});
