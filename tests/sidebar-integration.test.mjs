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
