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
    resolve(root, "shared/defaults.js"),
    resolve(root, "sidebar/utils.js"),
    resolve(root, "sidebar/api.js"),
    resolve(root, "sidebar/youtube-track-select.js"),
    resolve(root, "sidebar/content.js"),
    resolve(root, "sidebar/cache.js"),
    resolve(root, "sidebar/stats.js"),
    resolve(root, "sidebar/ui.js"),
    resolve(root, "sidebar/markmap-native.js"),
    resolve(root, "sidebar/conceptmap-filename.js"),
    resolve(root, "sidebar/conceptmap.js"),
    resolve(root, "sidebar/summary.js"),
    resolve(root, "sidebar/history.js"),
    resolve(root, "sidebar/sidebar.js"),
];

// Llista d'srcs que el bundle reemplaça. El patcher els elimina del HTML.
// Els scripts NO inclosos aquí (theme.js) es mantenen com a <script src=...>
// separats al HTML final.
const BUNDLED_SRCS = new Set([
    "../ext.js",
    "../shared/models.js",
    "../shared/defaults.js",
    "utils.js",
    "api.js",
    "youtube-track-select.js",
    "content.js",
    "cache.js",
    "stats.js",
    "ui.js",
    "markmap-native.js",
    "conceptmap-filename.js",
    "conceptmap.js",
    "summary.js",
    "history.js",
    "sidebar.js",
]);

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

// Patch sidebar.html: elimina els <script src=...> del bundle i insereix un sol
// <script src="sidebar.bundle.js"></script> just abans del primer script
// substituït (preservant l'ordre relatiu amb els scripts no-bundle).
if (htmlFile) {
    let html = readFileSync(htmlFile, "utf8");

    const scriptRegex = /[ \t]*<script\s+src="([^"]+)"\s*><\/script>\s*\r?\n?/g;
    let firstBundledMatch = null;
    const removed = [];

    html = html.replace(scriptRegex, (match, src) => {
        if (BUNDLED_SRCS.has(src)) {
            if (firstBundledMatch === null) firstBundledMatch = match;
            removed.push(src);
            return "";
        }
        return match;
    });

    if (removed.length === 0) {
        console.error("[build-sidebar-bundle] ERROR: cap script del bundle trobat a " + htmlFile);
        console.error("  BUNDLED_SRCS esperats: " + [...BUNDLED_SRCS].join(", "));
        process.exit(1);
    }

    // Insereix el bundle abans de </body>
    const bundleTag = '    <script src="sidebar.bundle.js"></script>\n  ';
    if (!html.includes("</body>")) {
        console.error("[build-sidebar-bundle] ERROR: no s'ha trobat </body> a " + htmlFile);
        process.exit(1);
    }
    html = html.replace("</body>", bundleTag + "</body>");

    writeFileSync(htmlFile, html, "utf8");
    console.log(`  Patched ${htmlFile.replace(root, ".")} (${removed.length} scripts -> bundle)`);
}
