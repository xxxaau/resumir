#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Genera els PNG de la icona (16, 32, 48, 64, 96, 128) a icons/prod/ i icons/dev/
 * a partir dels SVG font d'icons/src/ (icon-prod.svg i icon-dev.svg).
 * Fa servir Chromium de Playwright (fons transparent).
 *
 *   npm run icons:gen
 *   node scripts/icons-gen.mjs --export=tmp/icones   # còpia per a les botigues: SVG + PNG de 16 a 512 px
 *
 * Després, `npm run dev` / `npm run prod` copia el joc de la modalitat a icons/.
 */
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIZES = [16, 32, 48, 64, 96, 128];
const STORE_SIZES = [...SIZES, 256, 512];
const exportDir = process.argv.find(a => a.startsWith("--export="))?.slice(9);

function findChromium() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
    if (fs.existsSync(chromium.executablePath())) return undefined;
    const cache = path.join(os.homedir(), "Library", "Caches", "ms-playwright");
    if (!fs.existsSync(cache)) return undefined;
    for (const d of fs.readdirSync(cache).filter(n => /^chromium-\d+$/.test(n)).sort().reverse()) {
        const exe = path.join(cache, d, "chrome-mac-arm64", "Google Chrome for Testing.app", "Contents", "MacOS", "Google Chrome for Testing");
        if (fs.existsSync(exe)) return exe;
    }
    return undefined;
}

const exe = findChromium();
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
try {
    for (const mode of ["prod", "dev"]) {
        const svg = fs.readFileSync(path.join(root, "icons", "src", `icon-${mode}.svg`), "utf8");
        const uri = "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
        const sizes = exportDir ? STORE_SIZES : SIZES;
        const outDir = exportDir ? path.resolve(root, exportDir, mode) : path.join(root, "icons", mode);
        fs.mkdirSync(outDir, { recursive: true });
        if (exportDir) fs.copyFileSync(path.join(root, "icons", "src", `icon-${mode}.svg`), path.join(outDir, `icon-${mode}.svg`));
        for (const size of sizes) {
            const page = await browser.newPage({ viewport: { width: size, height: size } });
            await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="${uri}">`);
            await page.waitForFunction(() => document.images[0].complete);
            const out = path.join(outDir, `icon-${size}.png`);
            await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
            await page.close();
        }
        console.log(`  ${path.relative(root, outDir)}/: ${sizes.join(", ")} px`);
    }
} finally {
    await browser.close();
}
