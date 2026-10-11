// tests/default-prompts.test.mjs
// Contracte dels prompts per defecte: els ancoratges que el codi hi cerca, la
// seguretat, la mida (quota de storage.sync) i que no dupliquen les instruccions
// dinàmiques de cites que afegeix summary.js.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const src = readFileSync(new URL("../shared/defaults.js", import.meta.url), "utf8");
const D = vm.runInNewContext(src + `;({ DEFAULT_SYSTEM_PROMPT, DEFAULT_DEEP_DIVE_PROMPT, DEFAULT_SCIENCE_PROMPT,
    DEFAULT_CONCEPTMAP_PROMPT, DEFAULT_SIMPLE_PROMPT, DEFAULT_ANKI_PROMPT, promptHash, LEGACY_PROMPT_HASHES })`);
const { buildConceptMapPrompt } = require("../sidebar/summary.js");

const BY_KEY = {
    systemPrompt: D.DEFAULT_SYSTEM_PROMPT, deepDivePrompt: D.DEFAULT_DEEP_DIVE_PROMPT,
    sciencePrompt: D.DEFAULT_SCIENCE_PROMPT, conceptMapPrompt: D.DEFAULT_CONCEPTMAP_PROMPT,
    simplePrompt: D.DEFAULT_SIMPLE_PROMPT, ankiPrompt: D.DEFAULT_ANKI_PROMPT,
};

test("tots els prompts tracten el contingut com a dades no fiables", () => {
    for (const [k, p] of Object.entries(BY_KEY)) {
        assert.match(p, /UNTRUSTED_CONTENT/, k);
        assert.match(p, /SEGURETAT/, k);
    }
});

test("els prompts de prosa no porten les cites dinàmiques (les afegeix summary.js)", () => {
    for (const k of ["systemPrompt", "deepDivePrompt", "sciencePrompt", "simplePrompt"]) {
        assert.doesNotMatch(BY_KEY[k], /\(p\. N\)/, k);
        assert.doesNotMatch(BY_KEY[k], /\[m:ss\]/, k);
    }
});

test("els prompts de prosa comencen amb un paràgraf pla i usen capçaleres ### (resum executiu)", () => {
    for (const k of ["systemPrompt", "deepDivePrompt", "sciencePrompt", "simplePrompt"]) {
        assert.match(BY_KEY[k], /^### /m, `${k}: capçaleres ###`);
        assert.doesNotMatch(BY_KEY[k], /^\*\*/m, `${k}: sense negreta a l'inici de línia`);
    }
});

test("la mida cap a storage.sync (8192 bytes per element) amb marge per personalitzar", () => {
    for (const [k, p] of Object.entries(BY_KEY)) {
        assert.ok(Buffer.byteLength(JSON.stringify(p)) < 6500, `${k} és massa llarg`);
    }
});

test("Anki conserva els marcadors {{LANG}} i {{COUNT}} i l'exigència de JSON", () => {
    assert.match(D.DEFAULT_ANKI_PROMPT, /\{\{LANG\}\}/);
    assert.match(D.DEFAULT_ANKI_PROMPT, /\{\{COUNT\}\}/);
    assert.match(D.DEFAULT_ANKI_PROMPT, /JSON/);
});

test("mapa conceptual: els tres ancoratges de buildConceptMapPrompt existeixen al prompt real", () => {
    const base = D.DEFAULT_CONCEPTMAP_PROMPT;
    const out = buildConceptMapPrompt(base, 3, 8, false);
    assert.match(out, /Màxim 3 nivells de profunditat\./);
    assert.doesNotMatch(out, /Màxim 4 nivells/);
    assert.match(out, /Segon nivell: 6-8 branques principals\./);
    assert.doesNotMatch(out, /9\. Opcionalment/, "sense descripcions, la regla 9 desapareix");
    const withDesc = buildConceptMapPrompt(base, 4, 6, true);
    assert.match(withDesc, /9\. Opcionalment/);
    assert.match(withDesc, /Segon nivell: 4-6 branques principals\./);
});

test("el default vigent mai coincideix amb un hash retirat, i tots els prompts en tenen", () => {
    for (const [k, p] of Object.entries(BY_KEY)) {
        const legacy = D.LEGACY_PROMPT_HASHES[k];
        assert.ok(legacy && legacy.length > 0, `${k}: sense defaults retirats registrats`);
        assert.ok(!legacy.includes(D.promptHash(p)), `${k}: el default actual és a la llista de retirats`);
    }
});
