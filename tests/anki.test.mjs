/**
 * tests/anki.test.mjs — lògica pura del plugin Anki (parse + format + export).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const anki = require("../sidebar/anki.js");

test("parseAnkiCards: JSON net", () => {
    const raw = '[{"q":"Què és X?","a":"És Y."},{"q":"Quan?","a":"El 2020."}]';
    const cards = anki.parseAnkiCards(raw);
    assert.equal(cards.length, 2);
    assert.equal(cards[0].q, "Què és X?");
    assert.equal(cards[1].a, "El 2020.");
});

test("parseAnkiCards: JSON envoltat de prosa o fences", () => {
    const raw = 'Aquí tens:\n```json\n[{"q":"P","a":"R"}]\n```\nGràcies!';
    const cards = anki.parseAnkiCards(raw);
    assert.equal(cards.length, 1);
    assert.equal(cards[0].q, "P");
});

test("parseAnkiCards: invàlid o sense q/a → []", () => {
    assert.deepEqual(anki.parseAnkiCards("no és json"), []);
    assert.deepEqual(anki.parseAnkiCards('[{"q":"","a":"x"},{"a":"sense q"}]'), []);
});

test("formatCardForAnki: curta → inline STARTI...ENDI", () => {
    const out = anki.formatCardForAnki({ q: "Capital de França?", a: "París" });
    assert.equal(out, "STARTI [Basic] Capital de França? Back: París ENDI");
});

test("formatCardForAnki: llarga → bloc START...END amb Back: a la línia següent", () => {
    const longA = "x".repeat(120);
    const out = anki.formatCardForAnki({ q: "Pregunta llarga?", a: longA });
    assert.equal(out, `START\nBasic\nPregunta llarga?\nBack: \n${longA}\nEND`);
});

test("formatCardForAnki: amb salt de línia → bloc multi-línia encara que sigui curta", () => {
    const out = anki.formatCardForAnki({ q: "P", a: "línia1\nlínia2" });
    assert.ok(out.startsWith("START\nBasic\nP\nBack: \nlínia1\nlínia2\nEND"));
});

test("buildAnkiExport: separa targetes per línia en blanc", () => {
    const out = anki.buildAnkiExport([
        { q: "A?", a: "1" },
        { q: "B?", a: "2" },
    ]);
    assert.equal(out, "STARTI [Basic] A? Back: 1 ENDI\n\nSTARTI [Basic] B? Back: 2 ENDI");
});
