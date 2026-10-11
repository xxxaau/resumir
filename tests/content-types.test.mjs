/**
 * tests/content-types.test.mjs
 * isProseType: quins tipus de contingut es poden re-renderitzar com a text
 * (lectura biònica). Mapa conceptual i Anki tenen panell propi.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { isProseType } = require("../shared/content-types.js");

test("isProseType - tipus de text es poden re-renderitzar", () => {
    for (const t of ["summary", "deepdive", "science", "simple"]) {
        assert.equal(isProseType(t), true, t);
    }
});

test("isProseType - mapa conceptual i Anki no (tenen panell propi)", () => {
    assert.equal(isProseType("conceptmap"), false);
    assert.equal(isProseType("anki"), false);
});

test("isProseType - tipus desconegut o buit cau a resum (compatible amb entrades antigues)", () => {
    assert.equal(isProseType(undefined), true);
    assert.equal(isProseType("lite"), true);
});
