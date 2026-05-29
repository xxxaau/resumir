#!/usr/bin/env node
/**
 * scripts/patch-vendor-amo.mjs
 * Elimina les crides a eval() i new Function() dels fitxers vendor
 * per tal que l'AMO (addons.mozilla.org) no generi warnings.
 *
 * pdf.js v3.11.174 conté:
 *   - isEvalSupported(): new Function("")  — detecta suport a eval (2 fitxers)
 *   - new Function("c","size",...)    — compilació de glyphs CMap (pdf.min.js)
 *   - new Function("src","srcOffset",...) — compilació PostScript (worker)
 *   - Function("return this")() — obtenció del global object (2 fitxers)
 *   - eval("require")            — worker loader en mode Node.js (pdf.min.js)
 *
 * Totes les substitucions preserven semàntica o són dead code en un
 * context d'extensió de navegador (Firefox/Chromium).
 *
 * Usage:
 *   node scripts/patch-vendor-amo.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const CHANGES = [];

function patchFile(relPath, replacements) {
    const fullPath = resolve(root, relPath);
    let content = readFileSync(fullPath, "utf8");

    for (const { oldStr, newStr, desc } of replacements) {
        if (!content.includes(oldStr)) {
            console.error(`✗ ${relPath}: no s'ha trobat "${desc}". El vendor pot haver canviat — revisa THIRD_PARTY.md.`);
            process.exit(1);
        }
        content = content.replace(oldStr, newStr);
        CHANGES.push(`  ✓ ${desc}`);
    }

    writeFileSync(fullPath, content, "utf8");
    CHANGES.push(`  ✓ ${relPath}: desat`);
}

// ─── Ambdós fitxers ────────────────────────────────────────────────────

// isEvalSupported retorna false: tot new Function(...) intern pren la
// ruta intèrpret (fallback) i no s'usa el constructor Function.
patchFile("vendor/pdf.min.js", [
    {
        oldStr: 'function isEvalSupported(){try{new Function("");return!0}catch{return!1}}()',
        newStr: 'function isEvalSupported(){return!1}()',
        desc:   'isEvalSupported() retorna false (desactiva new Function optimitzacions)',
    },
    {
        oldStr: 'Function("return this")()',
        newStr: 'globalThis',
        desc:   'UMD global getter: Function("return this")() → globalThis',
    },
    {
        oldStr: 'eval("require")(this.workerSrc)',
        newStr: 'require(this.workerSrc)',
        desc:   'worker loader: eval("require") → require directe',
    },
    {
        oldStr: 'new Function("c","size",t.join(""))',
        newStr: '(void 0)',
        desc:   'dead code (isEvalSupported=false): new Function per glyphs eliminat',
    },
]);

patchFile("vendor/pdf.worker.min.js", [
    {
        oldStr: 'function isEvalSupported(){try{new Function("");return!0}catch{return!1}}()',
        newStr: 'function isEvalSupported(){return!1}()',
        desc:   'isEvalSupported() retorna false (desactiva new Function optimitzacions)',
    },
    {
        oldStr: 'Function("return this")()',
        newStr: 'globalThis',
        desc:   'UMD global getter: Function("return this")() → globalThis',
    },
    {
        oldStr: 'new Function("src","srcOffset","dest","destOffset",e)',
        newStr: '(void 0)',
        desc:   'dead code (isEvalSupported=false): new Function per PostScript eliminat',
    },
]);

console.log("\n📦 AMO patches aplicats:\n");
for (const c of CHANGES) console.log(c);
console.log("\n✅ Tots els fitxers vendor processats correctament.");
