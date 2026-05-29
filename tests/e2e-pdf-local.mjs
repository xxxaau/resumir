// Test E2E: verifica que el botó "Selecciona PDF local" agafa un PDF,
// n'extreu el text, obre una pestanya amb el PDF per consultar-lo,
// i passa el text al pipeline de resum directament (sense dependre de la
// pestanya nova per al contingut).
import { chromium } from "@playwright/test";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const fixturePdf = path.join(__dirname, "fixtures", "hello.pdf");

if (!fs.existsSync(fixturePdf)) {
    console.error(`Falta el PDF de fixture: ${fixturePdf}`);
    console.error(`Executa: node tests/generate-test-pdf.mjs`);
    process.exit(1);
}

// Prepara una còpia neta amb manifest.chromium.json com a manifest.json.
const extPath = path.join(__dirname, ".pw-extension");
if (fs.existsSync(extPath)) fs.rmSync(extPath, { recursive: true, force: true });
fs.mkdirSync(extPath, { recursive: true });

const skip = new Set(["node_modules", ".git", "build_firefox", "build_chromium", "scripts", "tests", ".pw-userdata", ".pw-extension", "spike", "docs"]);
for (const entry of fs.readdirSync(repoRoot)) {
    if (skip.has(entry)) continue;
    if (entry.startsWith("manifest") && entry !== "manifest.chromium.json") continue;
    fs.cpSync(path.join(repoRoot, entry), path.join(extPath, entry), { recursive: true });
}
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

// Descobreix l'extension ID via SW o background.
let extId = null;
const blankPage = await ctx.newPage();
await blankPage.goto("about:blank");
for (let i = 0; i < 50 && !extId; i++) {
    for (const sw of ctx.serviceWorkers()) {
        const m = sw.url().match(/chrome-extension:\/\/([^/]+)\//);
        if (m) { extId = m[1]; break; }
    }
    if (!extId) await new Promise(r => setTimeout(r, 300));
}
if (!extId) {
    console.error("\u274c No s'ha pogut descobrir l'extension ID");
    await ctx.close();
    process.exit(1);
}
console.log(`Extension ID: ${extId}`);

const sidebarUrl = `chrome-extension://${extId}/sidebar/sidebar.html`;
const sidebar = await ctx.newPage();

// Captura logs de consola per debugging.
sidebar.on("console", msg => console.log(`[sidebar:${msg.type()}] ${msg.text()}`));
sidebar.on("pageerror", err => console.log(`[sidebar:ERROR] ${err.message}`));

await sidebar.goto(sidebarUrl);
await sidebar.waitForLoadState("domcontentloaded");
console.log(`\u2713 Sidebar carregat`);

// Verifica que extractPdfText i pdfjsLib estan disponibles.
const apisReady = await sidebar.evaluate(() => ({
    pdfjsLib: typeof window.pdfjsLib !== "undefined",
    extractPdfText: typeof window.extractPdfText !== "undefined",
    selectPdfBtn: !!document.getElementById("selectPdfBtn"),
    pdfFileInput: !!document.getElementById("pdfFileInput"),
}));
console.log(`APIs disponibles:`, apisReady);

if (!apisReady.pdfjsLib || !apisReady.extractPdfText) {
    console.error("\u274c pdf.js no s'ha carregat al sidebar");
    await ctx.close();
    process.exit(1);
}
if (!apisReady.selectPdfBtn || !apisReady.pdfFileInput) {
    console.error("\u274c selectPdfBtn / pdfFileInput no presents al DOM");
    await ctx.close();
    process.exit(1);
}

// Espia noves pestanyes (el flux obre el PDF en una pestanya per consultar-lo).
const newPagePromise = ctx.waitForEvent("page", { timeout: 15000 });

// Simula la selecció del PDF via setInputFiles (Playwright dispara 'change').
console.log(`\nSeleccionant PDF: ${fixturePdf}`);
await sidebar.locator("#pdfFileInput").setInputFiles(fixturePdf);

// Espera la nova pestanya amb el PDF.
let newPage;
try {
    newPage = await newPagePromise;
    console.log(`\u2713 Nova pestanya oberta: ${newPage.url()}`);
} catch (err) {
    console.error(`\u274c No s'ha obert cap pestanya nova (timeout): ${err.message}`);
    await ctx.close();
    process.exit(1);
}

const newUrl = newPage.url();
if (!newUrl.includes("/sidebar/pdf-viewer.html")) {
    console.error(`\u274c L'URL de la pestanya nova no es el visor personalitzat: ${newUrl}`);
    await ctx.close();
    process.exit(1);
}
console.log(`\u2713 URL es el visor personalitzat: ${newUrl}`);

// Espera uns moments perquè el sidebar acabi d'extreure i preparar el pipeline.
await new Promise(r => setTimeout(r, 1500));

// Inspecciona l'estat del sidebar.
const sidebarState = await sidebar.evaluate(() => {
    const errorDiv = document.getElementById("error");
    const contentDiv = document.getElementById("content");
    const titleLink = document.getElementById("page-title-link");
    return {
        errorText: errorDiv ? errorDiv.textContent : null,
        errorHidden: errorDiv ? errorDiv.classList.contains("hidden") : null,
        contentText: contentDiv ? contentDiv.textContent.slice(0, 300) : null,
        titleText: titleLink ? titleLink.textContent : null,
        titleHref: titleLink ? titleLink.href : null,
    };
});

console.log(`\n=== Estat del sidebar despres de la selecció ===`);
console.log(JSON.stringify(sidebarState, null, 2));

// Screenshot final.
const shotPath = path.join(__dirname, "pdf-flow-shot.png");
await sidebar.screenshot({ path: shotPath, fullPage: true });
console.log(`\nScreenshot sidebar: ${shotPath}`);

const tabShotPath = path.join(__dirname, "pdf-flow-newtab.png");
await newPage.screenshot({ path: tabShotPath });
console.log(`Screenshot pestanya PDF: ${tabShotPath}`);

// Veredicte.
console.log(`\n=== VEREDICTE ===`);
const checks = {
    "Nova pestanya oberta amb visor personalitzat": newUrl.includes("/sidebar/pdf-viewer.html"),
    "Sidebar sense error PDF-xxx": !sidebarState.errorText || !sidebarState.errorText.includes("[PDF-"),
    "Title strip mostra nom fitxer": (sidebarState.titleText || "").toLowerCase().includes("hello") ||
                                       (sidebarState.titleText || "").toLowerCase().includes("pdf"),
    "No hi ha error 006": !sidebarState.errorText || !sidebarState.errorText.includes("[006]"),
};
let allPass = true;
for (const [name, ok] of Object.entries(checks)) {
    console.log(`${ok ? "\u2713" : "\u274c"} ${name}`);
    if (!ok) allPass = false;
}

// ===== Test addicional: verificar que el text extret arriba al pipeline =====
console.log(`\n=== Test 2: text extret arriba al pipeline ===`);

// Tanca la pestanya del PDF per netejar.
try { await newPage.close(); } catch { /* ignore */ }

// Obre un nou sidebar net amb api key configurada.
const sidebar2 = await ctx.newPage();
sidebar2.on("console", msg => console.log(`[sidebar2:${msg.type()}] ${msg.text()}`));
sidebar2.on("pageerror", err => console.log(`[sidebar2:ERROR] ${err.message}`));

await sidebar2.goto(sidebarUrl);
await sidebar2.waitForLoadState("domcontentloaded");

// Set API key dummy via storage.local.
await sidebar2.evaluate(async () => {
    await chrome.storage.local.set({ // eslint-disable-line no-undef
        apiKey: "DUMMY_KEY_FOR_TEST",
        model: "gemini-2.5-flash",
    });
});

// Intercepta crides a generativelanguage.googleapis.com a NIVELL CONTEXT.
let capturedBody = null;
await ctx.route("**/generativelanguage.googleapis.com/**", async (route) => {
    if (!capturedBody) {
        capturedBody = route.request().postData();
    }
    await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
            candidates: [{
                content: { parts: [{ text: "## Mock summary\n\nMock response from test." }] },
                finishReason: "STOP",
            }],
            usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 10 },
        }),
    });
});

// Recarrega per agafar la key.
await sidebar2.reload();
await sidebar2.waitForLoadState("domcontentloaded");

// Tornem a seleccionar el PDF (esperem la nova pestanya pero no la tanquem).
const newPagePromise2 = ctx.waitForEvent("page", { timeout: 15000 });
await sidebar2.locator("#pdfFileInput").setInputFiles(fixturePdf);
try {
    const _p2 = await newPagePromise2;
    console.log(`\u2713 Test 2: pestanya PDF oberta`);
    void _p2;
} catch {
    console.log(`\u2713 Test 2: pestanya PDF NO oberta (pot ser duplicat, OK)`);
}

// Espera la crida (fins 15s).
for (let i = 0; i < 50 && !capturedBody; i++) {
    await new Promise(r => setTimeout(r, 300));
}

const test2Checks = {
    "S'ha cridat l'API Gemini": !!capturedBody,
    "Cos conté 'Hello PDF Test World'": !!capturedBody && capturedBody.includes("Hello PDF Test World"),
    "Cos conté marca UNTRUSTED_CONTENT": !!capturedBody && capturedBody.includes("UNTRUSTED_CONTENT"),
};
for (const [name, ok] of Object.entries(test2Checks)) {
    console.log(`${ok ? "\u2713" : "\u274c"} ${name}`);
    if (!ok) allPass = false;
}

if (capturedBody && !capturedBody.includes("Hello PDF Test World")) {
    console.log(`\nFragment del cos enviat (primers 800 chars):`);
    console.log(capturedBody.slice(0, 800));
}

await ctx.close();
process.exit(allPass ? 0 : 1);
