#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * dev-firefox.mjs
 * Genera una carpeta UNPACKED de Firefox per al desenvolupament (about:debugging →
 * «Carrega un complement temporal» → build_firefox_dev/manifest.json).
 *
 * El mode DEV viu NOMÉS en aquesta carpeta (ignorada per git): nom «Resumir (DEV)»,
 * gecko.id de dev, `file:` a la CSP (PDFs locals) i icones taronges d'icons/dev/. Els fitxers
 * versionats (manifests, icons/) queden sempre en PROD i nets, així que no cal cap stash
 * abans de pujar ni hi ha risc de commitejar l'estat DEV.
 *
 * Com dev-chromium.mjs: no minifica ni bundleja el sidebar (sidebar.html referencia els
 * fitxers individuals).
 *
 *   npm run dev:firefox      (o `npm run dev`, que fa Firefox + Chromium)
 */

import { existsSync, rmSync, mkdirSync, copyFileSync, readdirSync, statSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outName = "build_firefox_dev";
const outDir = resolve(root, outName);

// Firefox carrega background.js i ext.js com a scripts normals (sense bundle de background).
const FILES = ["ext.js", "background.js", "Readability.js", "theme.js"];
const DIRS = ["icons", "options", "shared", "sidebar", "vendor"];

function copyDir(from, to) {
    mkdirSync(to, { recursive: true });
    for (const f of readdirSync(from)) {
        if (f === ".DS_Store") continue;
        const s = join(from, f), d = join(to, f);
        if (statSync(s).isDirectory()) copyDir(s, d);
        else copyFileSync(s, d);
    }
}

if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// 1. Manifest de Firefox + transformacions DEV (només a la còpia).
execSync(`node scripts/merge-manifest.mjs firefox "${outName}/manifest.json"`, { cwd: root, stdio: "inherit" });
const manifestPath = resolve(outDir, "manifest.json");
const m = JSON.parse(readFileSync(manifestPath, "utf8"));
if (!m.name.includes("(DEV)")) m.name = `${m.name} (DEV)`;
m.browser_specific_settings.gecko.id = "sergi.dev@xaudiera.xyz";
const csp = m.content_security_policy?.extension_pages;
if (csp && !csp.includes("file:")) m.content_security_policy.extension_pages = `${csp} file:`;
writeFileSync(manifestPath, JSON.stringify(m, null, 4) + "\n", "utf8");

// 2. Fitxers i directoris.
for (const f of FILES) {
    const s = resolve(root, f);
    if (existsSync(s)) copyFileSync(s, resolve(outDir, f));
    else console.warn(`  ⚠️  fitxer no trobat: ${f}`);
}
for (const d of DIRS) {
    const s = resolve(root, d);
    if (existsSync(s)) copyDir(s, resolve(outDir, d));
    else console.warn(`  ⚠️  directori no trobat: ${d}/`);
}

// 3. Icones DEV (taronges) sobre les de producció, i fora els subdirectoris interns.
for (const sz of [16, 32, 48, 64, 96, 128]) {
    copyFileSync(resolve(root, "icons", "dev", `icon-${sz}.png`), resolve(outDir, "icons", `icon-${sz}.png`));
}
for (const sub of ["dev", "prod", "src"]) {
    const p = resolve(outDir, "icons", sub);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

console.log(`\n✅ Carpeta dev de Firefox llesta:\n   ${outDir}\n`);
console.log("   about:debugging#/runtime/this-firefox → «Carrega un complement temporal…» → manifest.json d'aquesta carpeta");
console.log("   Després de canviar codi: torna a executar 'npm run dev:firefox' i clica «Recarrega».\n");
