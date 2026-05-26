// Inspecciona l'ordre dels botons al toolbar del sidebar carregant l'extensio
// directament a Chromium amb Playwright (persistent context + unpacked extension).
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

// Prepara una c\u00f2pia neta amb manifest.chromium.json com a manifest.json.
const extPath = path.join(__dirname, ".pw-extension");
if (fs.existsSync(extPath)) fs.rmSync(extPath, { recursive: true, force: true });
fs.mkdirSync(extPath, { recursive: true });

const skip = new Set(["node_modules", ".git", "build_firefox", "build_chromium", "scripts", "tests", ".pw-userdata", ".pw-extension", "spike", "docs"]);
for (const entry of fs.readdirSync(repoRoot)) {
    if (skip.has(entry)) continue;
    if (entry.startsWith("manifest") && entry !== "manifest.chromium.json") continue;
    const src = path.join(repoRoot, entry);
    const dst = path.join(extPath, entry);
    fs.cpSync(src, dst, { recursive: true });
}
// Renombra el manifest chromium a manifest.json.
fs.renameSync(path.join(extPath, "manifest.chromium.json"), path.join(extPath, "manifest.json"));

const userDataDir = path.join(__dirname, ".pw-userdata");
if (fs.existsSync(userDataDir)) fs.rmSync(userDataDir, { recursive: true, force: true });

console.log(`Extension dir: ${extPath}`);

const ctx = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
        `--disable-extensions-except=${extPath}`,
        `--load-extension=${extPath}`,
    ],
});

// Espera que el service worker es registri per descobrir l'extension ID.
let extId = null;

// Force una navegacio per accelerar l'aparicio del SW.
const blankPage = await ctx.newPage();
await blankPage.goto("about:blank");

for (let i = 0; i < 50 && !extId; i++) {
    const sws = ctx.serviceWorkers();
    for (const sw of sws) {
        const url = sw.url();
        const m = url.match(/chrome-extension:\/\/([^/]+)\//);
        if (m) { extId = m[1]; break; }
    }
    if (!extId) await new Promise(r => setTimeout(r, 300));
}

if (!extId) {
    // Fallback: cerca via background pages.
    const bg = ctx.backgroundPages()[0];
    if (bg) {
        const m = bg.url().match(/chrome-extension:\/\/([^/]+)\//);
        if (m) extId = m[1];
    }
}

if (!extId) {
    console.error("No s'ha pogut descobrir l'extension ID");
    await ctx.close();
    process.exit(1);
}

console.log(`Extension ID: ${extId}`);

const page = await ctx.newPage();
const sidebarUrl = `chrome-extension://${extId}/sidebar/sidebar.html`;
console.log(`Carregant: ${sidebarUrl}`);
await page.goto(sidebarUrl);
await page.waitForLoadState("domcontentloaded");

const buttons = await page.$$eval(".toolbar button", btns =>
    btns.map(b => ({
        id: b.id,
        title: b.title,
        visible: b.offsetParent !== null,
        rect: b.getBoundingClientRect ? {
            x: Math.round(b.getBoundingClientRect().x),
            y: Math.round(b.getBoundingClientRect().y),
            w: Math.round(b.getBoundingClientRect().width),
        } : null,
    }))
);

console.log("\n=== Botons al toolbar (ordre DOM + posicio visual) ===");
buttons.forEach((b, i) => {
    console.log(`${i + 1}. id=${b.id.padEnd(20)} visible=${b.visible} x=${b.rect?.x ?? "?"} title="${b.title}"`);
});

// Captura una screenshot per evidencia visual.
const shotPath = path.join(__dirname, "toolbar-shot.png");
const toolbar = await page.$(".toolbar");
if (toolbar) {
    await toolbar.screenshot({ path: shotPath });
    console.log(`\nScreenshot: ${shotPath}`);
}

// Confirma quin fitxer HTML s'ha carregat realment.
const htmlSrc = await page.evaluate(() => {
    const first = document.querySelector(".toolbar > button");
    return first ? first.outerHTML.slice(0, 200) : "(no buttons)";
});
console.log(`\nPrimer boto (raw HTML): ${htmlSrc}`);

await ctx.close();
