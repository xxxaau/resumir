// tests/conceptmap-filename.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { buildConceptMapFilename } = require("../sidebar/conceptmap-filename.js");

// Fixed date for deterministic results: 2026-05-22
const FIXED = new Date(2026, 4, 22);

test("format bàsic amb 2 paraules", () => {
    const r = buildConceptMapFilename("Mapes Conceptuals Interactius a NotebookLM", FIXED);
    assert.equal(r, "20260522_mapes_conceptuals.png");
});

test("truncament a les 2 primeres paraules significatives", () => {
    const r = buildConceptMapFilename("Anàlisi de fonts de dades obertes", FIXED);
    // "de" és stop-word → primeres significatives: analisi, fonts
    assert.equal(r, "20260522_analisi_fonts.png");
});

test("1 paraula significativa", () => {
    const r = buildConceptMapFilename("Anàlisi", FIXED);
    assert.equal(r, "20260522_analisi.png");
});

test("cap paraula significativa → _mapa", () => {
    const r = buildConceptMapFilename("de la el i", FIXED);
    assert.equal(r, "20260522_mapa.png");
});

test("rootLabel buit → _mapa", () => {
    assert.equal(buildConceptMapFilename("", FIXED), "20260522_mapa.png");
    assert.equal(buildConceptMapFilename(null, FIXED), "20260522_mapa.png");
    assert.equal(buildConceptMapFilename(undefined, FIXED), "20260522_mapa.png");
});

test("només símbols i emoji → _mapa", () => {
    const r = buildConceptMapFilename("·:—@#!? 🎯✨", FIXED);
    assert.equal(r, "20260522_mapa.png");
});

test("elimina diacrítics catalans (à è ò ú ç ï)", () => {
    const r = buildConceptMapFilename("Història àrab moderna", FIXED);
    assert.equal(r, "20260522_historia_arab.png");
});

test("elimina símbols i lowercase", () => {
    const r = buildConceptMapFilename("Web 2.0 — Eines Modernes!", FIXED);
    // "2" i "0" són tokens d'1 char → filtrats; queden web, eines, modernes
    assert.equal(r, "20260522_web_eines.png");
});

test("stop-words ca/es/en filtrats", () => {
    // ca
    assert.equal(buildConceptMapFilename("El parc de la Draga", FIXED), "20260522_parc_draga.png");
    // es
    assert.equal(buildConceptMapFilename("Las flores de los jardines", FIXED), "20260522_flores_jardines.png");
    // en
    assert.equal(buildConceptMapFilename("The future of the web", FIXED), "20260522_future_web.png");
});

test("truncament a 20 chars per paraula", () => {
    const r = buildConceptMapFilename("Supercalifragilisticexpialidocious Extraordinariament llarg", FIXED);
    // 'supercalifragilisticexpialidocious' → 20 chars: 'supercalifragilistice'
    // 'extraordinariament' té 18 chars (cap a 20)
    assert.equal(r, "20260522_supercalifragilistic_extraordinariament.png");
});

test("data en format YYYYMMDD amb padding zero", () => {
    // Gener (mes 0 → "01"), dia 3 ("03"), any 2025
    const d = new Date(2025, 0, 3);
    assert.equal(buildConceptMapFilename("Hello World", d), "20250103_hello_world.png");
});

test("tokens numèrics curts filtrats, llargs preservats", () => {
    assert.equal(buildConceptMapFilename("22è Dia de l'Estany", FIXED), "20260522_22e_dia.png");
    assert.equal(buildConceptMapFilename("5G internet futur", FIXED), "20260522_5g_internet.png");
});

test("normalització converteix ñ ç i altres a ASCII", () => {
    const r = buildConceptMapFilename("España piña niño", FIXED);
    assert.equal(r, "20260522_espana_pina.png");
});

test("espais múltiples col·lapsats", () => {
    const r = buildConceptMapFilename("   Mapa    de     Conceptes   ", FIXED);
    assert.equal(r, "20260522_mapa_conceptes.png");
});

test("rootLabel no-string (number) tractat defensivament", () => {
    const r = buildConceptMapFilename(42, FIXED);
    // "42" → token d'2 chars → no filtrat
    assert.equal(r, "20260522_42.png");
});
