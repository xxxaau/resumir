#!/usr/bin/env node
/**
 * set-mode.mjs - Cross-platform port of set_dev_mode.ps1
 * Alterna entre mode DEV i PROD: ajusta manifest.base.json (name), els patches
 * Firefox (gecko.id), regenera els manifests merged i copia les icones
 * corresponents (icons/dev/ o icons/prod/) a icons/.
 *
 * Usage:
 *   node scripts/set-mode.mjs dev
 *   node scripts/set-mode.mjs prod
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

const mode = process.argv[2];
if (!["dev", "prod"].includes(mode)) {
    console.error("ERROR: cal especificar mode 'dev' o 'prod'");
    console.error("Usage: node scripts/set-mode.mjs <dev|prod>");
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
function writeJson(p, obj)  { writeFileSync(p, JSON.stringify(obj, null, 4), "utf8"); }

const base = readJson(basePath);

if (mode === "dev") {
    console.log("Canviant a mode DESENVOLUPAMENT...");
    base.name = "Resumir (DEV)";
    writeJson(basePath, base);

    const ffPatch = readJson(ffPatchPath);
    ffPatch.browser_specific_settings.gecko.id = "sergi.dev@xaudiera.xyz";
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
