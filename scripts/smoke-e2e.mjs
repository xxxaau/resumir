/**
 * scripts/smoke-e2e.mjs
 * Prova de fum en un Chromium REAL amb l'extensió carregada (build_chromium_dev):
 * resum complet contra un Gemini simulat, línia de procedència, refinadors,
 * pestanyes per tipus, historial amb botó de tornar fix i pàgina de configuració.
 * Falla (exit 1) si hi ha errors de consola o alguna comprovació no es compleix.
 *
 * Ús:  npm run dev:chromium && npm run smoke:e2e
 * Env: CHROMIUM_PATH (executable alternatiu), SMOKE_OUT (carpeta de captures).
 * No forma part de `npm test` (necessita un navegador).
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXT = path.join(ROOT, "build_chromium_dev");
const OUT = process.env.SMOKE_OUT || fs.mkdtempSync(path.join(os.tmpdir(), "resumir-smoke-"));
const failures = [];
const check = (ok, msg) => { console.log(`${ok ? "OK  " : "FAIL"} ${msg}`); if (!ok) failures.push(msg); };

const ARTICLE = `<!doctype html><html><head><title>Article de prova</title></head><body><article><h1>Article de prova</h1>${"<p>La fusió nuclear imita el procés que alimenta les estrelles. Els investigadors han obtingut resultats prometedors amb el confinament magnètic del plasma a temperatures extremes.</p>".repeat(12)}</article></body></html>`;
const REPLY = "La fusió nuclear imita les estrelles.\n\n### Punts clau\n- Confinament magnètic del plasma\n- Resultats prometedors";

const ctx = await chromium.launchPersistentContext(path.join(OUT, "profile"), {
    headless: false,
    ...(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}),
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--headless=new"],
});
try {
    let [sw] = ctx.serviceWorkers();
    if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
    const id = new URL(sw.url()).host;
    const errors = [];

    await ctx.route("https://generativelanguage.googleapis.com/**", route => {
        if (route.request().url().includes("streamGenerateContent")) {
            const frame = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text: REPLY }] } }], usageMetadata: { promptTokenCount: 900, candidatesTokenCount: 60 } })}\n\n`;
            return route.fulfill({ status: 200, contentType: "text/event-stream", body: frame });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ models: [] }) });
    });
    await ctx.route("https://example.com/**", route => route.fulfill({ status: 200, contentType: "text/html", body: ARTICLE }));

    const tabA = await ctx.newPage();
    await tabA.goto("https://example.com/article");
    const tabInfo = await sw.evaluate(async () => (await chrome.tabs.query({ url: "https://example.com/*" }))[0]);
    await sw.evaluate(() => chrome.storage.local.set({ apiKey: "AIzaTEST_KEY_1234567890123456789012345" }));

    // La barra lateral veu la pestanya de l'article com a activa (en una pestanya normal seria ella mateixa)
    const page = await ctx.newPage();
    await page.setViewportSize({ width: 380, height: 780 });
    page.on("pageerror", e => errors.push(`pageerror: ${e.message}`));
    page.on("console", m => { if (m.type() === "error") errors.push(`console: ${m.text()}`); });
    await page.addInitScript((tab) => {
        const q = chrome.tabs.query.bind(chrome.tabs);
        chrome.tabs.query = async (info) => (info && info.active ? [tab] : q(info));
    }, { id: tabInfo.id, url: tabInfo.url, title: tabInfo.title, active: true, windowId: tabInfo.windowId });
    await page.goto(`chrome-extension://${id}/sidebar/sidebar.html`);
    await page.waitForTimeout(1000);
    check(await page.isVisible("#idle-state"), "estat en repòs visible amb la pàgina activa");

    await page.click("#summarizeBtn");
    await page.waitForSelector("#provenance:not(.hidden)", { timeout: 15000 });
    const prov = await page.textContent("#provenance");
    check(/Basat en \d+ paraules/.test(prov) && /tokens/.test(prov), `línia de procedència («${prov.trim().slice(0, 60)}…»)`);
    check(await page.isVisible("#refiners"), "refinadors visibles");
    check((await page.textContent("#content")).includes("Confinament magnètic"), "el resum es mostra");
    await page.screenshot({ path: path.join(OUT, "1-summary.png") });

    await page.waitForTimeout(500);
    const tabs = await page.$$eval("#type-tabs [role=tab]", els => els.map(e => e.getAttribute("aria-selected")));
    check(tabs.length === 1 && tabs[0] === "true", "pestanya «Resum» activa");

    await page.click("#historyBtn");
    await page.waitForSelector(".history-item");
    await page.click(".history-item-title");
    await page.waitForTimeout(600);
    await page.evaluate(() => { document.getElementById("content").style.minHeight = "3000px"; window.scrollTo(0, 800); });
    await page.waitForTimeout(300);
    const top = await page.$eval("#history-back-bar", el => el.getBoundingClientRect().top);
    check(top === 0, "el botó de tornar de l'historial és fix a dalt en fer scroll");
    await page.screenshot({ path: path.join(OUT, "2-history-entry.png") });

    const sp = await ctx.newPage();
    await sp.setViewportSize({ width: 1100, height: 900 });
    sp.on("pageerror", e => errors.push(`settings pageerror: ${e.message}`));
    sp.on("console", m => { if (m.type() === "error") errors.push(`settings console: ${m.text()}`); });
    await sp.goto(`chrome-extension://${id}/options/settings.html`);
    await sp.waitForTimeout(800);
    for (const tab of ["resum", "extensions", "anki", "about"]) {
        await sp.click(`.nav-item[data-tab="${tab}"]`).catch(() => {});
        await sp.waitForTimeout(250);
    }
    await sp.click('.nav-item[data-tab="resum"]');
    await sp.waitForTimeout(250);
    check(await sp.isVisible("#summaryFormat") && await sp.isVisible(".plugin-about"), "configuració de Resum: estil i descripció visibles");
    await sp.screenshot({ path: path.join(OUT, "3-settings-resum.png"), fullPage: true });

    check(errors.length === 0, `cap error de consola (${errors.length})`);
    errors.forEach(e => console.log("   ", e));
} finally {
    await ctx.close();
}
console.log(`Captures a ${OUT}`);
process.exit(failures.length ? 1 : 0);
