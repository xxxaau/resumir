/**
 * scripts/take-screenshots.mjs
 * Genera captures de pantalla de la sidebar per als listings d'AMO i CWS.
 * Ús: node scripts/take-screenshots.mjs
 * Requereix: npx playwright chromium descarregat (playwright v1.59+)
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "docs", "listing", "screenshots");

const SUMMARY_HTML = `
<h2>Intel·ligència artificial: el nou motor de la recerca científica</h2>
<p>Els models de llenguatge de gran escala estan transformant la manera com els investigadors analitzen dades, generen hipòtesis i revisen literatura científica. Laboratoris d'arreu del món integren eines d'IA als seus fluxos de treball habituals.</p>
<h3>Punts clau</h3>
<ul>
  <li>Els models LLM redueixen fins al 60% el temps dedicat a la revisió bibliogràfica</li>
  <li>Empreses com DeepMind i OpenAI col·laboren amb universitats per accelerar descobriments</li>
  <li>Els experts adverteixen sobre riscos de biaix i necessitat de verificació humana</li>
  <li>La UE prepara regulació específica per a l'ús d'IA en recerca biomèdica</li>
</ul>
<h3>Context</h3>
<p>Malgrat l'entusiasme, la comunitat científica debat sobre la reproduïbilitat dels resultats assistits per IA i la necessitat d'estàndards clars per a la publicació de recerques que en fan ús.</p>
`;

const YOUTUBE_SUMMARY_HTML = `
<h2>Com funciona un motor de fusió nuclear — Explicat en 10 minuts</h2>
<p>Vídeo del canal <em>Kurzgesagt – In a Nutshell</em>. Durada: 10:24 · Transcripció: 2.847 paraules</p>
<h3>Resum</h3>
<p>La fusió nuclear imita el procés que alimenta les estrelles: unir nuclis lleugers d'hidrogen per alliberar enormes quantitats d'energia amb molt pocs residus radioactius.</p>
<h3>Conceptes principals</h3>
<ul>
  <li><strong>Plasma confinat magnèticament</strong> — el tokamak manté el plasma a 150 milions de graus</li>
  <li><strong>ITER (França)</strong> — el reactor experimental més gran del món, operatiu el 2025</li>
  <li><strong>Ignició</strong> — el punt en què la fusió genera més energia de la que consumeix</li>
  <li><strong>Deuteri i triti</strong> — els combustibles més eficients, extrets de l'aigua de mar</li>
</ul>
<h3>Conclusió</h3>
<p>Tot i els reptes d'enginyeria, la fusió podria proporcionar energia pràcticament il·limitada i neta a partir de la dècada del 2040.</p>
`;

async function injectSummary(page, html, theme = "light", opts = {}) {
    await page.evaluate(({ html, theme, opts }) => {
        document.documentElement.setAttribute("data-actual-theme", theme);

        const content = document.getElementById("content");
        const footer = document.getElementById("footer-status");
        const titleStrip = document.getElementById("page-title-strip");
        const titleLink = document.getElementById("page-title-link");
        const loading = document.getElementById("loading");
        const error = document.getElementById("error");

        loading.classList.add("hidden");
        error.classList.add("hidden");
        content.innerHTML = html;
        content.classList.remove("hidden");
        footer.classList.remove("hidden");

        if (opts.showTitle) {
            titleLink.textContent = opts.titleText || "Article original";
            titleLink.href = "#";
            titleStrip.classList.remove("hidden");
        }

        if (opts.model) {
            const sel = document.getElementById("model-select");
            const opt = document.createElement("option");
            opt.textContent = opts.model;
            sel.appendChild(opt);
        }

        if (opts.timer) document.getElementById("generation-timer").textContent = opts.timer;
        if (opts.tokensIn) document.getElementById("tokens-in-count").textContent = opts.tokensIn;
        if (opts.tokensOut) document.getElementById("tokens-out-count").textContent = opts.tokensOut;

        if (opts.bionic) {
            // Aplica bionic reading: posa en negreta la primera meitat de cada paraula
            const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
            const nodes = [];
            let n;
            while ((n = walker.nextNode())) nodes.push(n);
            for (const node of nodes) {
                const span = document.createElement("span");
                span.innerHTML = node.textContent.replace(/\b(\w+)\b/g, (word) => {
                    const half = Math.ceil(word.length / 2);
                    return `<b>${word.slice(0, half)}</b>${word.slice(half)}`;
                });
                node.parentNode.replaceChild(span, node);
            }
            document.getElementById("bionicBtn").classList.add("active");
        }
    }, { html, theme, opts });
}

async function shot(page, name, width, height) {
    await page.setViewportSize({ width, height });
    await page.waitForTimeout(100);
    await page.screenshot({ path: path.join(OUT_DIR, name), fullPage: false });
    console.log(`  ✓ ${name} (${width}×${height})`);
}

async function main() {
    await mkdir(OUT_DIR, { recursive: true });

    const extPath = ROOT;
    const context = await chromium.launchPersistentContext("", {
        headless: true,
        args: [
            `--disable-extensions-except=${extPath}`,
            `--load-extension=${extPath}`,
            "--no-first-run",
            "--no-default-browser-check",
        ],
        ignoreDefaultArgs: ["--disable-component-extensions-with-background-pages"],
    });

    // Espera que l'extensió s'inicialitzi i troba el seu ID
    await new Promise(r => setTimeout(r, 1500));
    const extPage = await context.newPage();
    await extPage.goto("chrome://extensions/");
    await extPage.waitForTimeout(500);

    const extId = await extPage.evaluate(() => {
        const items = document.querySelector("extensions-manager")
            ?.shadowRoot?.querySelector("extensions-item-list")
            ?.shadowRoot?.querySelectorAll("extensions-item");
        for (const item of items || []) {
            const name = item.shadowRoot?.querySelector("#name")?.textContent?.trim();
            if (name?.includes("Resumir")) {
                return item.getAttribute("id");
            }
        }
        return null;
    });

    if (!extId) {
        console.error("No s'ha pogut trobar l'ID de l'extensió. Assegura't que el build de Chromium és vàlid.");
        await context.close();
        process.exit(1);
    }

    console.log(`Extensió trobada: ${extId}`);
    await extPage.close();

    const sidebarUrl = `chrome-extension://${extId}/sidebar/sidebar.html`;
    const page = await context.newPage();

    // — Captura 1: Resum d'article, tema clar, 1280×800 (CWS) —
    console.log("\nCaptura 1: article / tema clar / CWS");
    await page.goto(sidebarUrl);
    await page.waitForTimeout(600);
    await injectSummary(page, SUMMARY_HTML, "light", {
        showTitle: true,
        titleText: "Intel·ligència artificial: el nou motor de la recerca científica — The Guardian",
        model: "gemini-2.0-flash",
        timer: "3.2s",
        tokensIn: "12.4k",
        tokensOut: "0.8k",
    });
    await shot(page, "01-article-light-1280x800.png", 1280, 800);

    // — Captura 2: Resum d'article, tema fosc, 1280×800 —
    console.log("Captura 2: article / tema fosc / CWS");
    await page.goto(sidebarUrl);
    await page.waitForTimeout(600);
    await injectSummary(page, SUMMARY_HTML, "dark", {
        showTitle: true,
        titleText: "Intel·ligència artificial: el nou motor de la recerca científica — The Guardian",
        model: "gemini-2.0-flash",
        timer: "3.2s",
        tokensIn: "12.4k",
        tokensOut: "0.8k",
    });
    await shot(page, "02-article-dark-1280x800.png", 1280, 800);

    // — Captura 3: Resum YouTube, tema clar, 1280×800 —
    console.log("Captura 3: YouTube / tema clar / CWS");
    await page.goto(sidebarUrl);
    await page.waitForTimeout(600);
    await injectSummary(page, YOUTUBE_SUMMARY_HTML, "light", {
        showTitle: true,
        titleText: "Com funciona un motor de fusió nuclear — YouTube",
        model: "gemini-2.5-flash",
        timer: "4.7s",
        tokensIn: "28.1k",
        tokensOut: "1.1k",
    });
    await shot(page, "03-youtube-light-1280x800.png", 1280, 800);

    // — Captura 4: Lectura biònica, tema solaritzat, 1280×800 —
    console.log("Captura 4: lectura biònica / solarized / CWS");
    await page.goto(sidebarUrl);
    await page.waitForTimeout(600);
    await injectSummary(page, SUMMARY_HTML, "solarized", {
        showTitle: true,
        titleText: "Intel·ligència artificial: el nou motor de la recerca científica — The Guardian",
        model: "gemini-2.0-flash",
        timer: "3.2s",
        tokensIn: "12.4k",
        tokensOut: "0.8k",
        bionic: true,
    });
    await shot(page, "04-bionic-solarized-1280x800.png", 1280, 800);

    // — Captures AMO (750×442) —
    console.log("\nCaptures AMO (750×442):");
    await page.goto(sidebarUrl);
    await page.waitForTimeout(600);
    await injectSummary(page, SUMMARY_HTML, "light", {
        showTitle: true,
        titleText: "Intel·ligència artificial: el nou motor de la recerca científica",
        model: "gemini-2.0-flash",
        timer: "3.2s",
        tokensIn: "12.4k",
        tokensOut: "0.8k",
    });
    await shot(page, "05-article-light-750x442.png", 750, 442);

    await page.goto(sidebarUrl);
    await page.waitForTimeout(600);
    await injectSummary(page, YOUTUBE_SUMMARY_HTML, "dark", {
        showTitle: true,
        titleText: "Com funciona un motor de fusió nuclear — YouTube",
        model: "gemini-2.5-flash",
        timer: "4.7s",
    });
    await shot(page, "06-youtube-dark-750x442.png", 750, 442);

    await page.close();
    await context.close();
    console.log(`\nCaptures desades a: docs/listing/screenshots/`);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
