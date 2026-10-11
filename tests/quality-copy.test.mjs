/**
 * tests/quality-copy.test.mjs
 * Control de qualitat del text visible (català): frases que el pla de
 * microcopy (docs/PLA-UI-UX.md, Nivell 1) vol eliminar. És un RATCHET: cada
 * patró té un màxim igual al recompte actual; no pot créixer, i quan baixa cal
 * abaixar-lo aquí (així la llista només es pot escurçar). Tots a 0: qualsevol reaparició d'aquestes frases fa fallar la suite.
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

// El bloc de l'historial de canvis de settings.html es genera a partir de
// docs/CHANGELOG.md (registre històric: no es reescriu), no compta.
function visibleSource(file) {
    return readFileSync(file, "utf8")
        .replace(/<!-- CHANGELOG_START -->[\s\S]*?<!-- CHANGELOG_END -->/, "");
}

function count(pattern) {
    let n = 0;
    for (const f of sourceFiles()) {
        for (const line of visibleSource(f).split("\n")) {
            if (!isComment(line) && line.includes(pattern)) n++;
        }
    }
    return n;
}

const CEILINGS = [
    // [fragment, màxim actual, per què / alternativa]
    ["API Key",       0, "anglicisme: «clau d'API»"],
    ["Estimacio",     0, "falta l'accent: «Estimació»"],
    ["Resumidor",     0, "el producte es diu «Resumir»"],
    ["(F5)",          0, "F5 no val a macOS: «Recarrega la pestanya»"],
    ["Proveu-ho",     0, "tracte de tu, no de vosaltres: «Prova-ho»"],
    ["afegiu",        0, "tracte de tu: «afegeix»"],
    ["canvieu",       0, "tracte de tu: «canvia»"],
    ["Configurar Ara",0, "majúscula injustificada: «Configurar ara»"],
    ["Obre configuració", 0, "infinitiu: «Obrir la configuració»"],
    ["prompt de aprofundiment", 0, "apostrofació: «d'aprofundiment»"],
    ["Descarta-ho tot",     0, "infinitiu: «Descartar-ho tot»"],
    ["Selecciona-ho tot",   0, "infinitiu: «Seleccionar-ho tot»"],
    ["Afegeix (",           0, "diu on va: «Afegir a Obsidian (N)»"],
    ["4 Arxiu",             0, "ruta personal de l'autor: usa DEFAULT_OBSIDIAN_PATH"],
    ["3 Recursos",          0, "ruta personal de l'autor: usa DEFAULT_ANKI_PATH"],
];

for (const [fragment, ceiling, why] of CEILINGS) {
    test(`text: «${fragment}» no augmenta (${why})`, () => {
        const n = count(fragment);
        assert.ok(n <= ceiling, `«${fragment}» apareix ${n} cops (màxim ${ceiling}): ${why}`);
        assert.ok(n >= ceiling,
            `«${fragment}» ha baixat a ${n}: abaixa el màxim a ${n} a tests/quality-copy.test.mjs`);
    });
}
