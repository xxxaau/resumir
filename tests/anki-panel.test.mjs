/**
 * tests/anki-panel.test.mjs
 * renderAnkiPanel (jsdom): noms accessibles de les targetes i textos amb
 * infinitiu. Regressió: totes les caselles es deien «Incloure a l'exportació»,
 * els textareas no tenien nom i els botons barrejaven imperatiu i infinitiu.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createRequire } from "node:module";

const dom = new JSDOM("<!DOCTYPE html><body><div id='content'></div><div id='error'></div></body>");
global.document = dom.window.document;
global.confirm = () => true;
global.ext = { storage: { sync: { get: async () => ({}) }, local: { get: async () => ({}) } } };

const require = createRequire(import.meta.url);
const anki = require("../sidebar/anki.js");

function render(cards) {
    document.body.innerHTML = "<div id='content'></div><div id='error'></div>";
    anki.setAnkiCards(cards);
    const contentDiv = document.getElementById("content");
    anki.renderAnkiPanel({ contentDiv, errorDiv: document.getElementById("error"), getGlobalConfig: () => ({}), onGenerateMore() {} });
    return contentDiv;
}

test("anki - cada casella de selecció té un nom que identifica la targeta", () => {
    const c = render([{ q: "Capital de França?", a: "París" }, { q: "Capital d'Itàlia?", a: "Roma" }]);
    const names = [...c.querySelectorAll(".anki-select")].map(i => i.getAttribute("aria-label"));
    assert.equal(names.length, 2);
    assert.match(names[0], /Capital de França/);
    assert.match(names[1], /Capital d'Itàlia/);
    assert.notEqual(names[0], names[1]);
});

test("anki - els botons Editar/Descartar diuen de quina targeta són", () => {
    const c = render([{ q: "P1?", a: "R1" }]);
    assert.match(c.querySelector(".anki-edit").getAttribute("aria-label"), /Editar la targeta: P1\?/);
    assert.match(c.querySelector(".anki-discard").getAttribute("aria-label"), /Descartar la targeta: P1\?/);
});

test("anki - en editar, els textareas tenen nom (Pregunta/Resposta)", () => {
    const c = render([{ q: "P?", a: "R" }]);
    c.querySelector(".anki-edit").click();
    assert.equal(c.querySelector("textarea.anki-q").getAttribute("aria-label"), "Pregunta");
    assert.equal(c.querySelector("textarea.anki-a").getAttribute("aria-label"), "Resposta");
});

test("anki - editar la pregunta actualitza el nom de la casella", () => {
    const c = render([{ q: "Vella?", a: "R" }]);
    c.querySelector(".anki-edit").click();
    const q = c.querySelector("textarea.anki-q");
    q.value = "Nova pregunta?";
    q.dispatchEvent(new dom.window.Event("input"));
    assert.match(c.querySelector(".anki-select").getAttribute("aria-label"), /Nova pregunta/);
});

test("anki - textos dels botons en infinitiu i l'exportació diu on va", () => {
    const c = render([{ q: "P?", a: "R" }]);
    const texts = [...c.querySelectorAll("button")].map(b => b.textContent);
    for (const expected of ["Editar", "Descartar", "Generar més", "Descartar-ho tot", "Seleccionar-ho tot", "Afinar"]) {
        assert.ok(texts.includes(expected), `Falta el botó «${expected}» (té: ${texts.join(" | ")})`);
    }
    assert.ok(texts.some(t => /^Afegir a Obsidian \(\d+\)$/.test(t)), "L'exportació ha de dir que va a Obsidian");
});

test("anki - l'avís és una regió d'estat i el camp d'afinar té nom", () => {
    const c = render([{ q: "P?", a: "R" }]);
    const notice = c.querySelector("#ankiNotice");
    assert.equal(notice.getAttribute("role"), "status");
    assert.equal(c.querySelector(".anki-afina-input").getAttribute("aria-label"), "Afinar la generació de targetes");
});
