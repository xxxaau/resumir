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
    // DEFAULT_MODEL_ID real és "gemini-3.1-flash-lite"; 3.5 és més nou però
    // més car — l'ordre "newest first" per versió no ha de guanyar al default.
    const models = [
        { id: "gemini-3.5-flash-lite" },
        { id: DEFAULT_MODEL_ID },
        { id: "gemini-2.5-flash-lite" },
    ];
    const sorted = sortModelsByPriority(models);
    assert.equal(sorted[0].id, DEFAULT_MODEL_ID,
        `El primer ha de ser el model per defecte, és: "${sorted[0].id}"`);
});

test("sortModelsByPriority - sense el model per defecte a la llista, ordena per versió (més nou primer)", () => {
    const models = [
        { id: "gemini-2.5-flash-lite" },
        { id: "gemini-3.5-flash-lite" },
    ];
    const sorted = sortModelsByPriority(models);
    assert.equal(sorted[0].id, "gemini-3.5-flash-lite");
    assert.equal(sorted[1].id, "gemini-2.5-flash-lite");
});

test("sortModelsByPriority - accepta un array de strings (no només objectes)", () => {
    const sorted = sortModelsByPriority([DEFAULT_MODEL_ID, "gemini-2.5-pro"]);
    assert.equal(sorted[0], DEFAULT_MODEL_ID);
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
    await syncMock.set({ favoriteModels: ["gemini-2.5-pro"] });

    const favorites = await ensureFavoriteModels();

    assert.deepEqual(favorites, ["gemini-2.5-pro"],
        "Si l'usuari ha desmarcat el model per defecte, NO s'ha de tornar a afegir");
    const stored = await syncMock.get("favoriteModels");
    assert.deepEqual(stored.favoriteModels, ["gemini-2.5-pro"],
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
    assert.equal(describeModel("gemini-2.5-flash-lite").tier, "fast");
    assert.equal(describeModel("gemma-3-27b-it").tier, "fast");
    assert.equal(describeModel("gemini-3.6-flash").tier, "balanced");
    assert.equal(describeModel("gemini-2.5-pro").tier, "max");
    assert.equal(describeModel("gemini-2.5-pro").tierLabel, "Màxima qualitat");
    assert.equal(describeModel("gemini-9-ultra").tier, null);
    assert.equal(describeModel("gemini-9-ultra").name, "gemini-9-ultra");
    assert.equal(describeModel(DEFAULT_MODEL_ID).recommended, true);
    assert.equal(describeModel("gemini-2.5-pro").recommended, false);
    assert.equal(describeModel("gemini-2.5-flash").name, "Gemini 2.5 Flash");
});
