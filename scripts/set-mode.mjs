#!/usr/bin/env node
/**
 * set-mode.mjs — Deixa els fitxers VERSIONATS en mode PRODUCCIÓ: manifest.base.json (name),
 * els patches Firefox/Chromium (gecko.id), els manifests merged i les icones d'icons/prod/.
 *
 * El mode DEV ja NO reescriu fitxers versionats: es genera en carpetes ignorades per git
 * (`npm run dev` → build_firefox_dev/ i build_chromium_dev/). Això només cal si un fitxer
 * versionat ha quedat en estat DEV per error.
 *
 * Usage:
 *   node scripts/set-mode.mjs prod      (o `npm run prod`)
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const mode = process.argv[2];
if (mode === "dev") {
    console.error("El mode DEV ja no reescriu fitxers versionats. Usa `npm run dev` (genera build_firefox_dev/ i build_chromium_dev/).");
    process.exit(1);
}
if (mode !== "prod") {
    console.error("Usage: node scripts/set-mode.mjs prod");
    process.exit(1);
}

const basePath            = join(root, "manifest.base.json");
const ffPatchPath         = join(root, "manifest.firefox.patch.json");
const ffProdPatchPath     = join(root, "manifest.firefox.prod.patch.json");
const chromiumPatchPath   = join(root, "manifest.chromium.patch.json");
const chromiumProdPatchPath = join(root, "manifest.chromium.prod.patch.json");
const iconsDir    = join(root, "icons");
const iconsSrcDir = join(root, "icons", mode);

if (!existsSync(iconsSrcDir)) {
    console.error(`ERROR: no s'ha trobat '${iconsSrcDir}'.`);
    process.exit(1);
}

function readJson(p)        { return JSON.parse(readFileSync(p, "utf8").replace(/^\uFEFF/, "")); }
function writeJson(p, obj)  { writeFileSync(p, JSON.stringify(obj, null, 4) + "\n", "utf8"); }

const base = readJson(basePath);

if (mode === "dev") {
    console.log("Canviant a mode DESENVOLUPAMENT...");
    base.name = "Resumir (DEV)";
    writeJson(basePath, base);

    const ffPatch = readJson(ffPatchPath);
    ffPatch.browser_specific_settings.gecko.id = "sergi.dev@xaudiera.xyz";
    // Assegura file: a la CSP per provar PDFs locals en dev
    if (ffPatch.content_security_policy?.extension_pages &&
        !ffPatch.content_security_policy.extension_pages.includes("file:")) {
        ffPatch.content_security_policy.extension_pages += " file:";
    }
    writeJson(ffPatchPath, ffPatch);

    const chromiumPatch = readJson(chromiumPatchPath);
    writeJson(chromiumPatchPath, chromiumPatch);
} else {
    console.log("Canviant a mode PRODUCCIO...");
    base.name = "Resumir";
    writeJson(basePath, base);

    if (existsSync(ffProdPatchPath)) {
        copyFileSync(ffProdPatchPath, ffPatchPath);
        console.log("  Utilitzant patch Firefox de PRODUCCIO");
    } else {
        const ffPatch = readJson(ffPatchPath);
        ffPatch.browser_specific_settings.gecko.id = "sergi@xaudiera.xyz";
        writeJson(ffPatchPath, ffPatch);
    }

    if (existsSync(chromiumProdPatchPath)) {
        copyFileSync(chromiumProdPatchPath, chromiumPatchPath);
        console.log("  Utilitzant patch Chromium de PRODUCCIO");
    }
}

execSync(`node "${join(root, "scripts/merge-manifest.mjs")}" firefox  "${join(root, "manifest.json")}"`,         { stdio: "inherit" });
execSync(`node "${join(root, "scripts/merge-manifest.mjs")}" chromium "${join(root, "manifest.chromium.json")}"`, { stdio: "inherit" });

console.log("  Fitxers base i patch actualitzats. Manifests regenerats.");

for (const sz of [16, 32, 48, 64, 96, 128]) {
    const src = join(iconsSrcDir, `icon-${sz}.png`);
    const dst = join(iconsDir, `icon-${sz}.png`);
    copyFileSync(src, dst);
}
console.log(`  Icones copiades des de icons/${mode}/.`);
console.log(`Fet! Mode: ${mode.toUpperCase()}`);
