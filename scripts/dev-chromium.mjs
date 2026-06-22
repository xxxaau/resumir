#!/usr/bin/env node
/**
 * dev-chromium.mjs
 * Genera una carpeta UNPACKED de Chromium per carregar a Edge/Chrome durant el
 * desenvolupament. Resol el problema que el `manifest.json` de l'arrel és el de
 * Firefox (background.scripts + sidebar_action, sense side_panel ni service
 * worker), que NO funciona a Edge/Chrome.
 *
 * Diferències amb `build.mjs`:
 *   - No minifica i NO bundleja els scripts del sidebar (iteració ràpida:
 *     sidebar.html referencia els fitxers individuals, com a l'arrel).
 *   - Deixa la carpeta (no fa zip ni la esborra) per poder carregar-la.
 *   - No té el guard de mode prod (és exclusivament per a dev).
 *
 * Ús:
 *   npm run dev:chromium
 *   → carrega ./build_chromium_dev a edge://extensions
 *     (Mode desenvolupador → "Carregar desempaquetada")
 *   Després de canviar codi, torna a executar-lo i clica "recarregar" a Edge.
 */

import { existsSync, rmSync, mkdirSync, copyFileSync, readdirSync, statSync } from "fs";
import { resolve, dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const outName = "build_chromium_dev";
const outDir = resolve(root, outName);

// Fitxers d'arrel que l'extensió necessita (alguns injectats via executeScript).
const FILES = ["ext.js", "background.bundle.js", "Readability.js", "theme.js"];
const DIRS = ["icons", "options", "shared", "sidebar", "vendor"];

function copyDir(from, to) {
    mkdirSync(to, { recursive: true });
    for (const f of readdirSync(from)) {
        const s = join(from, f);
        const d = join(to, f);
        if (statSync(s).isDirectory()) copyDir(s, d);
        else copyFileSync(s, d);
    }
}

// 1. Neteja la carpeta de sortida.
if (existsSync(outDir)) rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

// 2. Regenera el bundle del service worker (sense minificar, per depurar millor).
execSync("node scripts/build-chromium-bundle.mjs", { cwd: root, stdio: "inherit" });

// 3. manifest.json = variant Chromium (side_panel + service worker).
execSync(`node scripts/merge-manifest.mjs chromium "${outName}/manifest.json"`, { cwd: root, stdio: "inherit" });

// 4. Copia fitxers i directoris.
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

// 5. Treu subdirectoris interns d'icones (no calen a l'extensió carregada).
for (const sub of ["dev", "prod"]) {
    const p = resolve(outDir, "icons", sub);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
}

console.log(`\n✅ Carpeta dev de Chromium llesta:\n   ${outDir}\n`);
console.log("   1. Obre edge://extensions  (o chrome://extensions)");
console.log("   2. Activa el «Mode de desenvolupador»");
console.log("   3. «Carregar desempaquetada» → tria la carpeta de dalt");
console.log("   Després de canviar codi: torna a executar 'npm run dev:chromium' i clica recarregar.\n");
