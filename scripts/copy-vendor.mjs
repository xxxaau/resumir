#!/usr/bin/env node
/**
 * scripts/copy-vendor.mjs
 * Copia el bundle UMD de defuddle a l'arrel de l'extensió.
 * Actualitzar: npm update defuddle && npm run vendor:update
 *
 * S'usa index.full.js (571KB) perquè inclou turndown i retorna
 * contentMarkdown. index.js (173KB) no inclou la conversió a Markdown.
 */
import { copyFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = resolve(root, "node_modules/defuddle/dist/index.full.js");
const dest = resolve(root, "defuddle.js");

if (!existsSync(src)) {
    console.error(`ERROR: no s'ha trobat ${src}. Executa npm install primer.`);
    process.exit(1);
}

copyFileSync(src, dest);
console.log(`defuddle.js actualitzat des de node_modules/defuddle/dist/index.full.js`);
