#!/usr/bin/env node
/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Genera els PNG de la icona (16, 32, 48, 64, 96, 128) a icons/prod/ i icons/dev/
 * a partir dels SVG font d'icons/src/ (icon-prod.svg i icon-dev.svg).
 * Fa servir Chromium de Playwright (fons transparent).
 *
 *   npm run icons:gen
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
        for (const size of SIZES) {
            const page = await browser.newPage({ viewport: { width: size, height: size } });
            await page.setContent(`<style>html,body{margin:0;background:transparent}img{display:block;width:${size}px;height:${size}px}</style><img src="${uri}">`);
            await page.waitForFunction(() => document.images[0].complete);
            const out = path.join(root, "icons", mode, `icon-${size}.png`);
            await page.screenshot({ path: out, omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
            await page.close();
        }
        console.log(`  icons/${mode}/: ${SIZES.join(", ")} px`);
    }
} finally {
    await browser.close();
}
