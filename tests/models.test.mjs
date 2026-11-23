/**
 * tests/models.test.mjs
 * Tests unitaris per a shared/models.js: sortModelsByPriority i ensureFavoriteModels.
 * Execució: node --test tests/models.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);
const { sortModelsByPriority, ensureFavoriteModels, DEFAULT_MODEL_ID } = require("../shared/models.js");

// ---------------------------------------------------------------------------
// sortModelsByPriority
// ---------------------------------------------------------------------------

test("sortModelsByPriority - el model per defecte surt sempre primer, tot i no ser el més nou", () => {
    // DEFAULT_MODEL_ID real és "gemini-3.5-flash-lite"; Gemini 4 és més nou
    // però no és el default — l'ordre "newest first" no ha de guanyar al default.
    const models = [
        { id: "gemini-4-carbon" },
        { id: DEFAULT_MODEL_ID },
        { id: "gemini-3.1-flash-lite" },
    ];
    const sorted = sortModelsByPriority(models);
    assert.equal(sorted[0].id, DEFAULT_MODEL_ID,
        `El primer ha de ser el model per defecte, és: "${sorted[0].id}"`);
});

test("sortModelsByPriority - sense el model per defecte a la llista, ordena per versió (més nou primer)", () => {
    const models = [
        { id: "gemini-3.1-flash-lite" },
        { id: "gemini-3.5-flash-lite" },
    ];
    const sorted = sortModelsByPriority(models);
    assert.equal(sorted[0].id, "gemini-3.5-flash-lite");
    assert.equal(sorted[1].id, "gemini-3.1-flash-lite");
});

test("sortModelsByPriority - accepta un array de strings (no només objectes)", () => {
    const sorted = sortModelsByPriority([DEFAULT_MODEL_ID, "gemini-4-carbon"]);
    assert.equal(sorted[0], DEFAULT_MODEL_ID);
});

test("sortModelsByPriority - la família Gemini 4 va amb els Pro, no amb «Altres»", () => {
    const sorted = sortModelsByPriority([
        "gemini-3.1-pro-preview",
        "gemini-4-carbon",
    ]);
    assert.deepEqual(sorted, ["gemini-4-carbon", "gemini-3.1-pro-preview"]);
});

// ---------------------------------------------------------------------------
// ensureFavoriteModels
// ---------------------------------------------------------------------------

const syncMock = createStorageMock();

function setupExt() {
    global.ext = { storage: { sync: syncMock } };
}

test("ensureFavoriteModels - primer ús: inicialitza amb el model per defecte", async () => {
    syncMock._clear();
    setupExt();
    const favorites = await ensureFavoriteModels();
    assert.deepEqual(favorites, [DEFAULT_MODEL_ID]);
    const stored = await syncMock.get("favoriteModels");
    assert.deepEqual(stored.favoriteModels, [DEFAULT_MODEL_ID]);
});

test("ensureFavoriteModels - respecta uns favorits existents sense el model per defecte", async () => {
    syncMock._clear();
    setupExt();
    await syncMock.set({ favoriteModels: ["gemini-4-carbon"] });

    const favorites = await ensureFavoriteModels();

    assert.deepEqual(favorites, ["gemini-4-carbon"],
        "Si l'usuari ha desmarcat el model per defecte, NO s'ha de tornar a afegir");
    const stored = await syncMock.get("favoriteModels");
    assert.deepEqual(stored.favoriteModels, ["gemini-4-carbon"],
        "No s'ha d'escriure res a storage quan els favorits ja existeixen");
});

test("ensureFavoriteModels - una llista de favorits buida es manté buida (no es reinicialitza)", async () => {
    syncMock._clear();
    setupExt();
    await syncMock.set({ favoriteModels: [] });

    const favorites = await ensureFavoriteModels();

    assert.deepEqual(favorites, []);
});

// ---------------------------------------------------------------------------
// describeModel: nom llegible + nivell per a la configuració
// ---------------------------------------------------------------------------
test("describeModel - nivell segons la família i «Recomanat» només el model per defecte", () => {
    const { describeModel } = require("../shared/models.js");
    assert.equal(describeModel("gemini-3.5-flash-lite").tier, "fast");
    assert.equal(describeModel("gemma-4-31b-it").tier, "fast");
    assert.equal(describeModel("gemini-3.8-flash").tier, "balanced");
    assert.equal(describeModel("gemini-4-carbon").tier, "max");
    assert.equal(describeModel("gemini-4-carbon").tierLabel, "Màxima qualitat");
    assert.equal(describeModel("gemini-9-ultra").tier, null);
    assert.equal(describeModel("gemini-9-ultra").name, "gemini-9-ultra");
    assert.equal(describeModel(DEFAULT_MODEL_ID).recommended, true);
    assert.equal(describeModel("gemini-4-carbon").recommended, false);
    assert.equal(describeModel("gemini-3.8-flash").name, "Gemini 3.8 Flash");
});
