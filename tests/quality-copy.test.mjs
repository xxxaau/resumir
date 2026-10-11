/**
 * tests/quality-copy.test.mjs
 * Control de qualitat del text visible (català): frases que el pla de
 * microcopy (docs/PLA-UI-UX.md, Nivell 1) vol eliminar. És un RATCHET: cada
 * patró té un màxim igual al recompte actual; no pot créixer, i quan baixa cal
 * abaixar-lo aquí (així la llista només es pot escurçar). Objectiu: tot a 0.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function sourceFiles() {
    const dirs = ["sidebar", "options", "shared"];
    const files = [join(ROOT, "background.js"), join(ROOT, "manifest.base.json")];
    for (const d of dirs) {
        for (const f of readdirSync(join(ROOT, d))) {
            if (/\.(js|html)$/.test(f)) files.push(join(ROOT, d, f));
        }
    }
    return files;
}

// Línies que NO compten: comentaris de codi (no són text visible)
const isComment = (line) => /^\s*(\/\/|\*|\/\*|<!--)/.test(line);

function count(pattern) {
    let n = 0;
    for (const f of sourceFiles()) {
        for (const line of readFileSync(f, "utf8").split("\n")) {
            if (!isComment(line) && line.includes(pattern)) n++;
        }
    }
    return n;
}

const CEILINGS = [
    // [fragment, màxim actual, per què / alternativa]
    ["API Key",   6, "anglicisme: «clau d'API»"],
    ["Estimacio", 2, "falta l'accent: «Estimació»"],
    ["Resumidor", 1, "el producte es diu «Resumir»"],
    ["(F5)",      1, "F5 no val a macOS: «Recarrega la pestanya»"],
    ["Proveu-ho", 3, "tracte de tu, no de vosaltres: «Prova-ho»"],
    ["afegiu",    1, "tracte de tu: «afegeix»"],
    ["canvieu",   1, "tracte de tu: «canvia»"],
];

for (const [fragment, ceiling, why] of CEILINGS) {
    test(`text: «${fragment}» no augmenta (${why})`, () => {
        const n = count(fragment);
        assert.ok(n <= ceiling, `«${fragment}» apareix ${n} cops (màxim ${ceiling}): ${why}`);
        assert.ok(n >= ceiling,
            `«${fragment}» ha baixat a ${n}: abaixa el màxim a ${n} a tests/quality-copy.test.mjs`);
    });
}
