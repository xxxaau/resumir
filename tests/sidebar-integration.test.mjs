/**
 * tests/sidebar-integration.test.mjs
 * Tests d'integració de sidebar.js carregat de veritat (sidebar.html + scripts)
 * dins de jsdom. Cobreix comportament que no es pot provar important el mòdul.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSidebar } from "./helpers/sidebar-harness.mjs";

test("harness - la barra lateral es carrega i mostra la targeta d'onboarding sense clau", async () => {
    const h = await loadSidebar();
    try {
        assert.ok(h.document.querySelector(".api-key-warning-container"),
            "Sense clau ha de mostrar la targeta d'onboarding");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.15): l'enllaç «veure nova versió» de l'avís de prompt posava el
// flag *UpdateAvailable a false ABANS d'obrir Configuració, que només mostra
// el seu avís (mantenir/restaurar) si el flag és true: l'usuari no el veia mai.
// ---------------------------------------------------------------------------
test("avís de prompt nou - l'enllaç obre Configuració SENSE esborrar el flag (perquè hi surti l'avís)", async () => {
    const h = await loadSidebar({
        // Prompt d'aprofundiment personalitzat amb versió antiga: la migració de
        // càrrega aixeca el flag deepDivePromptUpdateAvailable (flux real).
        sync: {
            enableDeepdive: true,
            deepDivePrompt: "El meu prompt personalitzat",
            promptVersions: { deepDivePrompt: 1, sciencePrompt: 2, conceptMapPrompt: 2, simplePrompt: 1 },
        },
        local: { apiKey: "AIza_test" },
    });
    try {
        h.document.getElementById("deepDiveBtn").click();
        await h.flush();

        const banner = h.document.getElementById("prompt-update-notification");
        assert.ok(!banner.classList.contains("hidden"), "L'avís ha de ser visible");

        h.document.getElementById("prompt-update-link").click();
        await h.flush();

        assert.equal(h.calls.openOptionsPage, 1, "Ha d'obrir Configuració");
        const { deepDivePromptUpdateAvailable } = await h.storage.sync.get("deepDivePromptUpdateAvailable");
        assert.equal(deepDivePromptUpdateAvailable, true,
            "El flag ha de seguir actiu perquè Configuració mostri l'avís de mantenir/restaurar");
        assert.ok(!banner.classList.contains("hidden"),
            "L'avís es manté per poder tornar-hi i continuar");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.1): el botó de lectura biònica re-renderitzava el resum com a
// text encara que el contingut fos el mapa conceptual, que es convertia en una
// llista i perdia l'SVG interactiu pagat en tokens.
// ---------------------------------------------------------------------------
test("biònica - activar/desactivar NO destrueix el mapa conceptual a pantalla", async () => {
    const h = await loadSidebar({
        sync: { enableConceptMap: true, enableBionic: true },
        local: { apiKey: "AIza_test" },
        pageText: "Un article llarg sobre ciència. ".repeat(20),
        modelReply: "- Ciència\n  - Mètode\n  - Dades",
    });
    try {
        h.document.getElementById("conceptMapBtn").click();
        await h.flush(30);

        const mapBefore = h.document.querySelector("#content .markmap-container");
        assert.ok(mapBefore, "Després de generar el mapa, ha de veure's el contenidor del mapa");

        const bionic = h.document.getElementById("bionicBtn");
        bionic.click();
        await h.flush(10);
        assert.ok(h.document.querySelector("#content .markmap-container"),
            "Activar la biònica no pot substituir el mapa per text");

        bionic.click();
        await h.flush(10);
        assert.ok(h.document.querySelector("#content .markmap-container"),
            "Desactivar-la tampoc");
    } finally { h.close(); }
});

test("biònica - amb un resum de text SÍ es re-renderitza (no és un no-op)", async () => {
    const h = await loadSidebar({
        sync: { enableBionic: true },
        local: { apiKey: "AIza_test" },
        pageText: "Un article llarg sobre ciència. ".repeat(20),
        modelReply: "Resum curt del contingut.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("content").textContent.includes("Resum curt"));

        h.document.getElementById("bionicBtn").click();
        await h.flush(10);
        assert.ok(h.document.querySelector("#content b, #content strong, #content .bionic"),
            "Amb la biònica activa el text ha de dur negretes");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.2): en obrir una entrada de l'Historial, currentMetadata no
// s'actualitzava; en tornar a la barra d'eines, Copiar exportava el resum
// anterior (el generat abans d'obrir l'Historial), no el que es veia.
// ---------------------------------------------------------------------------
function seedHistoryEntry() {
    const url = "https://altra.example/b";
    const key = `summary_cache:${url}:summary`;
    return {
        [key]: {
            url, title: "Pàgina B", summary: "Resum de l'altra pàgina B",
            model: "gemini-2.5-flash", timestamp: new Date().toISOString(),
            version: "1.0", stats: { input: 1, output: 1 }, type: "summary",
        },
        summary_cache_index: [key],
    };
}

test("historial - Copiar exporta l'entrada que es veu, no el resum anterior", async () => {
    const h = await loadSidebar({
        sync: { enableMarkdown: true },
        local: { apiKey: "AIza_test", ...seedHistoryEntry() },
        pageText: "Un article llarg. ".repeat(20),
        modelReply: "Resum A (el que es va generar abans)",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("content").textContent.includes("Resum A"));

        // Obre l'Historial i carrega l'entrada B
        h.document.getElementById("historyBtn").click();
        await h.flush(10);
        const item = [...h.document.querySelectorAll("#history-panel .history-item")]
            .find(li => li.textContent.includes("Pàgina B"));
        assert.ok(item, "L'entrada B ha de sortir a l'Historial");
        item.click();
        await h.flush(10);
        assert.ok(h.document.getElementById("content").textContent.includes("altra pàgina B"));

        // Torna a la barra d'eines passant per l'Historial (camí del bug)
        h.document.getElementById("historyBackBtn").click();
        await h.flush(10);
        h.document.querySelector("#history-panel .history-back-btn").click();
        await h.flush(10);

        h.document.getElementById("copyBtn").click();
        await h.flush(10);

        assert.equal(h.calls.clipboard.length, 1, "Ha de copiar alguna cosa");
        assert.ok(h.calls.clipboard[0].includes("altra pàgina B"),
            `Ha de copiar l'entrada visible, ha copiat: ${h.calls.clipboard[0]}`);
        assert.ok(!h.calls.clipboard[0].includes("Resum A"), "No ha de copiar el resum anterior");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// L3: la regió d'estat per a lectors de pantalla. El contingut en streaming no
// és una regió activa (es llegiria a trossos); #sr-status, present i buida des
// de la càrrega, anuncia només el cicle de vida.
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

test("regió d'estat - existeix, és polida i està buida en carregar", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        const el = h.document.getElementById("sr-status");
        assert.ok(el, "Ha d'existir #sr-status des de la càrrega");
        assert.equal(el.getAttribute("role"), "status");
        assert.equal(el.getAttribute("aria-live"), "polite");
        assert.equal(el.textContent, "");
        assert.ok(!h.document.getElementById("content").hasAttribute("aria-live"),
            "El contingut en streaming no pot ser una regió activa");
    } finally { h.close(); }
});

test("regió d'estat - anuncia «Resum complet» en acabar una generació", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        await sleep(250); // l'anunci s'escriu 100 ms després de buidar la regió
        assert.match(h.document.getElementById("sr-status").textContent, /Resum complet/);
    } finally { h.close(); }
});

test("avís de prompt nou - «de» s'apostrofa davant de vocal («d'aprofundiment»)", async () => {
    const h = await loadSidebar({
        sync: {
            enableDeepdive: true,
            deepDivePrompt: "El meu prompt",
            promptVersions: { deepDivePrompt: 1, sciencePrompt: 2, conceptMapPrompt: 2, simplePrompt: 1 },
        },
        local: { apiKey: "AIza_test" },
    });
    try {
        h.document.getElementById("deepDiveBtn").click();
        await h.flush();
        const text = h.document.getElementById("prompt-update-text").textContent;
        assert.match(text, /prompt d'aprofundiment/);
        assert.doesNotMatch(text, /de aprofundiment/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Historial (H5/H6): era un <li role=button> amb <span role=button> a dins
// (interactius niats: els interns quedaven inaccessibles) i el focus es perdia
// en obrir/tancar el panell o una entrada.
// ---------------------------------------------------------------------------
function seedTwoTypes() {
    const url = "https://altra.example/b";
    const mk = (type, summary) => ({
        url, title: "Pàgina B", summary, model: "m",
        timestamp: new Date().toISOString(), version: "1.0", stats: { input: 1, output: 1 }, type,
    });
    const k1 = `summary_cache:${url}:summary`, k2 = `summary_cache:${url}:deepdive`;
    return { [k1]: mk("summary", "Resum B"), [k2]: mk("deepdive", "Aprofundiment B"), summary_cache_index: [k1, k2] };
}

test("historial - sense interactius niats: botons reals germans dins d'un <li> no interactiu", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedTwoTypes() } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        const li = h.document.querySelector("#history-panel .history-item");
        assert.ok(li);
        assert.notEqual(li.getAttribute("role"), "button", "L'<li> no ha de ser role=button");
        assert.equal(li.querySelectorAll('[role="button"]').length, 0, "Cap role=button niat");
        assert.equal(li.querySelector(".history-item-title").tagName, "BUTTON");
        const icons = [...li.querySelectorAll(".type-icon")];
        assert.equal(icons.length, 2);
        for (const i of icons) {
            assert.equal(i.tagName, "BUTTON");
            assert.match(i.getAttribute("aria-label"), /Pàgina B/, "El nom accessible diu de quina entrada és");
            assert.equal(i.closest("button.history-item-title"), null, "No pot ser dins d'un altre botó");
        }
    } finally { h.close(); }
});

test("historial - el focus va a l'encapçalament en obrir el panell i torna al botó en tancar-lo", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedTwoTypes() } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        assert.equal(h.document.activeElement, h.document.getElementById("history-heading"));
        h.document.querySelector("#history-panel .history-back-btn").click();
        await h.flush();
        assert.equal(h.document.activeElement, h.document.getElementById("historyBtn"));
    } finally { h.close(); }
});

test("historial - triar una icona de tipus obre aquell tipus i deixa el focus a «Tornar a l'historial»", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedTwoTypes() } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        h.document.querySelector('#history-panel .type-icon[data-type="deepdive"]').click();
        await h.flush();
        assert.match(h.document.getElementById("content").textContent, /Aprofundiment B/);
        assert.equal(h.document.activeElement, h.document.getElementById("historyBackBtn"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Mapa conceptual (M1/M2): l'SVG no tenia semàntica (buit per a un lector),
// els nodes plegables no deien si estaven oberts, i en plegar/desplegar es
// reconstruïa tot l'SVG i el focus del teclat es perdia.
// ---------------------------------------------------------------------------
async function generateMap(h) {
    h.document.getElementById("conceptMapBtn").click();
    await h.flush(30);
    return h.document.querySelector("#content .markmap-container");
}
const mapOptions = () => ({
    sync: { enableConceptMap: true },
    local: { apiKey: "AIza_test" },
    pageText: "Un article. ".repeat(30),
    modelReply: "- Ciència\n  - Mètode\n    - Hipòtesi\n  - Dades",
});

test("mapa - l'SVG té rol d'imatge amb nom, i hi ha una vista de llista equivalent", async () => {
    const h = await loadSidebar(mapOptions());
    try {
        const container = await generateMap(h);
        assert.ok(container);
        const svg = container.querySelector("svg[role='img']");
        assert.ok(svg, "L'SVG principal ha de ser role=img");
        assert.match(svg.getAttribute("aria-label"), /Mapa conceptual/);
        assert.match(svg.getAttribute("aria-label"), /llista/);

        const listBtn = h.document.querySelector("#content .markmap-list-btn");
        assert.ok(listBtn, "Ha d'haver-hi un botó de vista de llista");
        const listView = h.document.querySelector("#content .markmap-list");
        assert.ok(listView.classList.contains("hidden"), "Comença en vista de mapa");

        listBtn.click();
        assert.ok(!listView.classList.contains("hidden"));
        assert.ok(container.classList.contains("hidden"), "El mapa s'amaga en veure la llista");
        assert.equal(listBtn.getAttribute("aria-pressed"), "true");
        assert.match(listView.textContent, /Ciència/);
        assert.match(listView.textContent, /Mètode/);
        assert.ok(listView.querySelector("details, li"), "La llista ha de ser estructura real (details/li)");

        listBtn.click();
        assert.ok(listView.classList.contains("hidden"));
        assert.ok(!container.classList.contains("hidden"));
    } finally { h.close(); }
});

test("mapa - els botons de plegar diuen si el node és obert (aria-expanded)", async () => {
    const h = await loadSidebar(mapOptions());
    try {
        await generateMap(h);
        await h.flush(10);
        const toggles = [...h.document.querySelectorAll("#content .markmap-toggle")];
        assert.ok(toggles.length > 0, "Hi ha d'haver nodes amb fills");
        for (const t of toggles) {
            assert.ok(["true", "false"].includes(t.getAttribute("aria-expanded")));
            assert.match(t.getAttribute("aria-label"), /^(Desplegar|Plegar)/);
        }
    } finally { h.close(); }
});

test("mapa - plegar/desplegar un node manté el focus al seu botó (l'SVG es reconstrueix)", async () => {
    const h = await loadSidebar(mapOptions());
    try {
        await generateMap(h);
        await h.flush(10);
        const first = h.document.querySelector("#content .markmap-toggle");
        const label = first.getAttribute("aria-label").replace(/^(Desplegar|Plegar)/, "");
        const before = first.getAttribute("aria-expanded");
        first.focus();
        first.dispatchEvent(new h.window.Event("click", { bubbles: true }));
        await h.flush(5);
        const active = h.document.activeElement;
        assert.ok(active && active.classList && active.classList.contains("markmap-toggle"),
            "El focus ha de quedar en un botó de plegar, no a <body>");
        assert.ok(active.getAttribute("aria-label").endsWith(label), "…i és el del mateix node");
        assert.notEqual(active.getAttribute("aria-expanded"), before, "L'estat ha canviat");
    } finally { h.close(); }
});
