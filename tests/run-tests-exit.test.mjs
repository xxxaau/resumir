/**
 * tests/run-tests-exit.test.mjs
 * El runner de tests no pot sortir amb èxit si `node --test` no s'ha executat.
 * Execució: node --test tests/run-tests-exit.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { exitCodeFor } from "../scripts/run-tests-exit.mjs";

test("exitCodeFor - conserva el codi de sortida de node --test", () => {
    assert.equal(exitCodeFor({ status: 0 }), 0);
    assert.equal(exitCodeFor({ status: 2 }), 2);
});

test("exitCodeFor - un error de spawn (ENOENT) no és un èxit", () => {
    assert.equal(exitCodeFor({ status: null, error: new Error("ENOENT") }), 1);
});

test("exitCodeFor - un procés mort per senyal no és un èxit", () => {
    assert.equal(exitCodeFor({ status: null, signal: "SIGTERM" }), 1);
});

test("exitCodeFor - sense status ni resultat no és un èxit", () => {
    assert.equal(exitCodeFor({ status: null }), 1);
    assert.equal(exitCodeFor(undefined), 1);
});
