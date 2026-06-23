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

test("estat: setAnkiCards desmarca per defecte i getSelected filtra", () => {
    anki.setAnkiCards([{ q: "A?", a: "1" }, { q: "B?", a: "2" }]);
    let all = anki.getAnkiCards();
    assert.equal(all.length, 2);
    assert.equal(all[0].selected, false, "per defecte desmarcada");
    assert.equal(anki.getSelectedAnkiCards().length, 0, "cap seleccionada d'inici");
    all[0].selected = true;
    anki.setAnkiCards(all); // re-set respectant selected existent
    const sel = anki.getSelectedAnkiCards();
    assert.equal(sel.length, 1);
    assert.equal(sel[0].q, "A?");
});

test("estat: setAllAnkiSelected marca/desmarca totes", () => {
    anki.setAnkiCards([{ q: "A?", a: "1" }, { q: "B?", a: "2" }]);
    anki.setAllAnkiSelected(true);
    assert.equal(anki.getSelectedAnkiCards().length, 2);
    anki.setAllAnkiSelected(false);
    assert.equal(anki.getSelectedAnkiCards().length, 0);
});

test("estat: appendAnkiCards afegeix sense duplicar preguntes", () => {
    anki.setAnkiCards([{ q: "A?", a: "1" }]);
    anki.appendAnkiCards([{ q: "A?", a: "dup" }, { q: "C?", a: "3" }]);
    const all = anki.getAnkiCards();
    assert.equal(all.length, 2); // "A?" no es duplica
    const c = all.find(x => x.q === "C?");
    assert.ok(c && c.selected === false, "les noves entren desmarcades");
});

test("buildAnkiRegenPrompt inclou exclusió i enfocament", () => {
    const p = anki.buildAnkiRegenPrompt("BASE {{LANG}} {{COUNT}}", "ca", 5, ["Què és X?", "Quan?"], "dates i xifres");
    assert.ok(p.includes("català"));
    assert.ok(p.includes("5"), "ha de substituir {{COUNT}} pel nombre de targetes");
    assert.ok(p.includes("Què és X?") && p.includes("Quan?"), "ha de llistar les preguntes a excloure");
    assert.ok(/dates i xifres/.test(p), "ha d'incloure l'enfocament");
});
