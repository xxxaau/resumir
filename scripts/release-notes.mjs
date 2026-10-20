#!/usr/bin/env node
/**
 * release-notes.mjs
 * Imprimeix per consola les novetats d'una versió (secció del CHANGELOG sense
 * les entrades internes), a punt per copiar i enganxar a AMO o a la GitHub Release.
 *
 * Ús: node scripts/release-notes.mjs [X.Y.Z]   (per defecte, la versió de package.json)
 *     node scripts/release-notes.mjs [X.Y.Z] --out fitxer.md
 * S'executa sol després de `npm version` (hook `postversion`) i a la CI.
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { extractReleaseNotes } from "./changelog-lib.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outIdx = args.indexOf("--out");
const outFile = outIdx !== -1 ? args[outIdx + 1] : null;
const version = args.find((a, i) => !a.startsWith("--") && i !== outIdx + 1)
    || JSON.parse(readFileSync(resolve(root, "package.json"), "utf8")).version;

const md = readFileSync(resolve(root, "docs/CHANGELOG.md"), "utf8");
const notes = extractReleaseNotes(md, version);

if (!notes) {
    console.error(`✗ docs/CHANGELOG.md no té una capçalera exacta «## [${version}] - AAAA-MM-DD» (guionet ASCII i data ISO).`);
    process.exit(1);
}

if (outFile) writeFileSync(resolve(root, outFile), notes + "\n");
else {
    console.log(`\n──── Novetats de la v${version} (copia i enganxa) ────\n`);
    console.log(notes);
    console.log("\n──────────────────────────────────────────────────\n");
}
