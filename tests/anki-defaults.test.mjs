import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const defaults = require("../shared/defaults.js");
const { CONTENT_TYPES } = require("../shared/content-types.js");

test("DEFAULT_ANKI_PROMPT existeix i té els marcadors clau", () => {
    const p = defaults.DEFAULT_ANKI_PROMPT;
    assert.equal(typeof p, "string");
    assert.ok(p.length > 50);
    assert.ok(/UNTRUSTED_CONTENT/.test(p), "ha d'incloure el bloc de seguretat");
    assert.ok(/JSON/i.test(p), "ha de demanar sortida JSON");
});

test("defaults d'Anki", () => {
    assert.equal(defaults.DEFAULT_ANKI_PATH, "3 Recursos/Anki.md");
    assert.equal(defaults.DEFAULT_ANKI_PACKET, 5);
    assert.equal(defaults.DEFAULT_ANKI_LANG, "ca");
});

test("'anki' registrat a DEFAULT_EXTENSION_ORDER i CONTENT_TYPES", () => {
    assert.ok(defaults.DEFAULT_EXTENSION_ORDER.includes("anki"));
    assert.ok(CONTENT_TYPES.some(t => t.id === "anki"));
});
