// tests/prompt-migration.test.mjs
// Cobreix la funció pura computePromptMigration (shared/defaults.js): el versionat
// per-prompt de la migració de prompts. Invariant clau: MAI esborra un prompt
// personalitzat; només treu claus que igualen el default i commuta flags.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { computePromptMigration } = require("../shared/defaults.js");

// Defs i versions de prova (independents del text real dels prompts).
const DEFS = [
    { key: "sciencePrompt", defaultVal: "SCI_DEF", customizedKey: "sciCust", updateKey: "sciUpd" },
    { key: "deepDivePrompt", defaultVal: "DD_DEF", customizedKey: "ddCust", updateKey: "ddUpd" },
];
const VERS = { sciencePrompt: 2, deepDivePrompt: 2 };

test("usuari nou (storage buit): fixa versions, cap banner, flags false", () => {
    const { toSet, toRemove } = computePromptMigration({}, DEFS, VERS);
    assert.deepEqual(toSet.promptVersions, { sciencePrompt: 2, deepDivePrompt: 2 });
    assert.equal(toSet.sciCust, false);
    assert.equal(toSet.sciUpd, false);
    assert.equal(toSet.ddUpd, false);
    assert.deepEqual(toRemove, []);
});

test("usuari al dia sense personalitzar: cap canvi", () => {
    const stored = { promptVersions: { sciencePrompt: 2, deepDivePrompt: 2 } };
    const { toSet, toRemove } = computePromptMigration(stored, DEFS, VERS);
    assert.deepEqual(toSet, {});
    assert.deepEqual(toRemove, []);
});

test("prompt personalitzat amb versió bumpada: avisa NOMÉS aquell prompt", () => {
    // science puja a v2; l'usuari el té personalitzat i estava a v1. deepDive ja és v2 i no personalitzat.
    const stored = {
        promptVersions: { sciencePrompt: 1, deepDivePrompt: 2 },
        sciencePrompt: "el meu prompt", sciCust: true,
    };
    const { toSet } = computePromptMigration(stored, DEFS, VERS);
    assert.equal(toSet.sciUpd, true, "science ha d'avisar");
    assert.equal(toSet.sciCust, true);
    assert.equal(toSet.ddUpd, undefined, "deepDive NO ha de tocar-se (banner fals evitat)");
    assert.equal(toSet.promptVersions.sciencePrompt, 2);
});

test("prompt no personalitzat amb versió antiga: adopta default silenciosament", () => {
    const stored = {
        promptVersions: { sciencePrompt: 1, deepDivePrompt: 2 },
        sciencePrompt: "SCI_DEF", // igual al default → cau al default
    };
    const { toSet, toRemove } = computePromptMigration(stored, DEFS, VERS);
    assert.ok(toRemove.includes("sciencePrompt"), "treu la clau perquè caigui al default");
    assert.equal(toSet.sciUpd, false);
    assert.equal(toSet.sciCust, false);
});

test("usuari heretat (promptDefaultsVersion, sense promptVersions): neteja la clau antiga", () => {
    const stored = { promptDefaultsVersion: 4, sciencePrompt: "custom", sciCust: true };
    const { toSet, toRemove } = computePromptMigration(stored, DEFS, VERS);
    assert.ok(toRemove.includes("promptDefaultsVersion"));
    assert.equal(toSet.sciUpd, true, "personalitzat → avisa");
    assert.deepEqual(toSet.promptVersions, { sciencePrompt: 2, deepDivePrompt: 2 });
});

test("banner ja descartat no es re-mostra (versió al dia, encara personalitzat)", () => {
    const stored = {
        promptVersions: { sciencePrompt: 2, deepDivePrompt: 2 },
        sciencePrompt: "custom", sciCust: true, sciUpd: false, // l'usuari ja el va descartar
    };
    const { toSet } = computePromptMigration(stored, DEFS, VERS);
    assert.equal(toSet.sciUpd, undefined, "no re-activa l'avís descartat");
    assert.equal(toSet.sciCust, undefined, "no toca el flag d'un personalitzat al dia");
});

test("neteja de flag obsolet: al dia, marcat com personalitzat però igual al default", () => {
    const stored = {
        promptVersions: { sciencePrompt: 2, deepDivePrompt: 2 },
        sciencePrompt: "SCI_DEF", sciCust: true, sciUpd: true,
    };
    const { toSet } = computePromptMigration(stored, DEFS, VERS);
    assert.equal(toSet.sciCust, false);
    assert.equal(toSet.sciUpd, false);
});

test("INVARIANT: mai posa un prompt personalitzat a toRemove", () => {
    const stored = {
        promptVersions: { sciencePrompt: 1, deepDivePrompt: 1 },
        sciencePrompt: "custom A", sciCust: true,
        deepDivePrompt: "custom B", ddCust: true,
    };
    const { toRemove } = computePromptMigration(stored, DEFS, VERS);
    assert.ok(!toRemove.includes("sciencePrompt"));
    assert.ok(!toRemove.includes("deepDivePrompt"));
});
