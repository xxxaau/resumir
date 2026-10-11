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
