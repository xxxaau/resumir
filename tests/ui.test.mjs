/**
 * tests/ui.test.mjs
 * Tests unitaris per a sidebar/ui.js (funcions de formatació de text)
 * Execució: node --test tests/ui.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

// Configurar DOM global via jsdom
const dom = new JSDOM("<!DOCTYPE html><body></body>");
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;

const require = createRequire(import.meta.url);

// ui.js necessita ext i CURATED_MODELS com a globals del navegador
// (les funcions de formatació no les usen, però el fitxer les referencia)
global.ext = { storage: { sync: { get: async () => ({}), set: async () => {} } } };
const { CURATED_MODELS } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;

// getCuratedModelInfo és un global de browser definit a api.js — mock mínim
global.getCuratedModelInfo = () => ({ rpd: 1500 });

const { formatTextToFragment, formatBionicText } = require("../sidebar/ui.js");

// ---------------------------------------------------------------------------
// formatBionicText
// ---------------------------------------------------------------------------

test("formatBionicText - retorna un fragment no buit per a text vàlid", () => {
    const frag = formatBionicText("Hola món");
    assert.ok(frag.childNodes.length > 0, "El fragment ha de tenir fills");
});

test("formatBionicText - paraula de 4 caràcters en negreta els 2 primers (ceil(4*0.45)=2)", () => {
    const frag = formatBionicText("Test");
    const bold = frag.querySelector("b");
    assert.ok(bold, "Ha d'haver-hi un element <b>");
    assert.equal(bold.textContent, "Te", "La fixació biònica ha de cobrir els primers 2 caràcters");
});

test("formatBionicText - text d'un sol caràcter resulta en un <b> amb el caràcter", () => {
    const frag = formatBionicText("A");
    // Primer fill ha de ser un <b>
    const b = Array.from(frag.childNodes).find(n => n.nodeName === "B");
    assert.ok(b, "Ha d'haver-hi un <b>");
    assert.equal(b.textContent, "A");
});

// ---------------------------------------------------------------------------
// formatTextToFragment — Markdown bàsic
// ---------------------------------------------------------------------------

test("formatTextToFragment - text buit retorna fragment buit", () => {
    const frag = formatTextToFragment("");
    assert.equal(frag.childNodes.length, 0);
});

test("formatTextToFragment - paràgraf simple genera un <p>", () => {
    const frag = formatTextToFragment("Hola món");
    const p = frag.querySelector("p");
    assert.ok(p, "Ha de generar un element <p>");
    assert.equal(p.textContent, "Hola món");
});

test("formatTextToFragment - # genera un <h1>", () => {
    const frag = formatTextToFragment("# Títol principal");
    const h1 = frag.querySelector("h1");
    assert.ok(h1, "Ha de generar <h1>");
    assert.equal(h1.textContent, "Títol principal");
});

test("formatTextToFragment - ## genera un <h2>", () => {
    const frag = formatTextToFragment("## Subtítol");
    const h2 = frag.querySelector("h2");
    assert.ok(h2, "Ha de generar <h2>");
});

test("formatTextToFragment - llista amb * genera <ul><li>", () => {
    const frag = formatTextToFragment("* Primer\n* Segon");
    const ul = frag.querySelector("ul");
    assert.ok(ul, "Ha de generar <ul>");
    const items = ul.querySelectorAll("li");
    assert.equal(items.length, 2);
    assert.equal(items[0].textContent, "Primer");
    assert.equal(items[1].textContent, "Segon");
});

test("formatTextToFragment - llista amb - genera <ul><li>", () => {
    const frag = formatTextToFragment("- Element A\n- Element B");
    const ul = frag.querySelector("ul");
    assert.ok(ul, "Ha de generar <ul>");
    assert.equal(ul.querySelectorAll("li").length, 2);
});

test("formatTextToFragment - **text** genera <strong>", () => {
    const frag = formatTextToFragment("Paraula **important** aquí");
    const strong = frag.querySelector("strong");
    assert.ok(strong, "Ha de generar <strong>");
    assert.equal(strong.textContent, "important");
});

test("formatTextToFragment - link Markdown [text](url) genera <a>", () => {
    const frag = formatTextToFragment("[Exemple](https://example.com)");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a>");
    assert.equal(a.href, "https://example.com/");
    assert.equal(a.textContent, "Exemple");
});

test("formatTextToFragment - URL bare genera <a>", () => {
    // Nota: el regex exclou punts de URLs bare per evitar falsos positius en frases.
    // Usem localhost (sense punt) per validar que sí es genera l'<a>.
    const frag = formatTextToFragment("Visita https://localhost/ruta avui");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a> per URL bare");
    assert.ok(a.href.startsWith("https://localhost"));
});

test("formatTextToFragment - mode biònic actiu afegeix <b> a les paraules", () => {
    const frag = formatTextToFragment("Paraula test", true);
    const boldElements = frag.querySelectorAll("b");
    assert.ok(boldElements.length > 0, "El mode biònic ha de generar elements <b>");
});
