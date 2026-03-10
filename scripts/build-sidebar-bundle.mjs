#!/usr/bin/env node
/**
 * build-sidebar-bundle.mjs
 * Concatena els scripts de la sidebar i genera sidebar.bundle.js per al build de producció.
 * Usa esbuild per validar la sintaxi i minificar opcionalment.
 * Si s'especifica --html=<path>, patcheja el HTML per referenciar el bundle.
 *
 * Usage:
 *   node scripts/build-sidebar-bundle.mjs --out=<path> [--html=<path>] [--minify]
 */

import { transformSync } from "esbuild";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const minify  = process.argv.includes("--minify");
const outFile = process.argv.find(a => a.startsWith("--out="))?.slice(6);
const htmlFile = process.argv.find(a => a.startsWith("--html="))?.slice(7);

if (!outFile) {
    console.error("ERROR: cal especificar --out=<path>");
    process.exit(1);
}

// Ordre de càrrega idèntic al de sidebar.html
const files = [
    resolve(root, "ext.js"),
    resolve(root, "shared/models.js"),
    resolve(root, "sidebar/utils.js"),
    resolve(root, "sidebar/api.js"),
    resolve(root, "sidebar/content.js"),
    resolve(root, "sidebar/cache.js"),
    resolve(root, "sidebar/stats.js"),
    resolve(root, "sidebar/ui.js"),
    resolve(root, "sidebar/summary.js"),
    resolve(root, "sidebar/sidebar.js"),
];

const header = [
    "// sidebar.bundle.js - Auto-generated for production build",
    "// DO NOT EDIT - edit individual source files instead",
    "",
].join("\n");

const combined = header + files.map(f => {
    const name = f.slice(root.length + 1).replace(/\\/g, "/");
    return `\n\n// --- ${name} ---\n\n` + readFileSync(f, "utf8");
}).join("");

const result = transformSync(combined, {
    loader: "js",
    target: "firefox115",
    minify,
});

for (const w of result.warnings) {
    console.warn(`[esbuild] ${w.text}`);
}

writeFileSync(outFile, header + result.code, "utf8");
console.log(`  Generated ${outFile.replace(root, ".")}${minify ? " (minified)" : ""}`);

// Patch sidebar.html per referenciar el bundle en lloc dels scripts individuals
if (htmlFile) {
    let html = readFileSync(htmlFile, "utf8");

    // Substitueix el bloc de <script> individuals per un sol <script> del bundle
    html = html.replace(
        /(\s*<script src="\.\.\/ext\.js"><\/script>\s*\n\s*<script src="\.\.\/shared\/models\.js"><\/script>[\s\S]*?<script src="sidebar\.js"><\/script>)/,
        '\n    <script src="sidebar.bundle.js"></script>'
    );

    writeFileSync(htmlFile, html, "utf8");
    console.log(`  Patched ${htmlFile.replace(root, ".")}`);
}
