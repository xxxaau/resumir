/**
 * scripts/web-captures-lib.mjs
 * Base comuna dels scripts de captures del web (web-captures.mjs, web-hero-anim.mjs):
 * Chromium real amb l'extensió (build_chromium_dev), Gemini simulat, un article servit
 * a un domini fals i la barra lateral oberta com a pestanya sobre aquest article.
 * Requereix: npm run dev:chromium && npx playwright install chromium
 */
import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const SHOTS = path.join(ROOT, "web", "src", "shots");
const EXT = path.join(ROOT, "build_chromium_dev");
export const ARTICLE_URL = "https://quadern.example/ciencia/per-que-oblidem-el-que-llegim";

export const QUOTES = [
    "El cervell no està fet per guardar-ho tot",
    "El resultat, publicat el 1885, es coneix com la corba de l'oblit",
    "s'esvaeix en les primeres hores i els primers dies",
    "confonem familiaritat amb coneixement",
    "la fixa molt més que tornar-la a llegir",
    "la corba de l'oblit es fa cada cop més plana",
];

const FILLER = [
    "Quan estudiem, tendim a pensar que la memòria funciona com un disc dur: allò que hi entra, hi queda. La realitat és molt diferent, i entendre-ho ens ajuda a organitzar millor el temps d'estudi.",
    "Els primers experiments sobre la memòria es van fer amb llistes de síl·labes sense sentit, perquè així el coneixement previ no hi interferia. Les conclusions s'han repetit amb material molt més variat.",
    "Això no vol dir que no puguem aprendre: vol dir que el ritme amb què repassem importa tant com el temps que hi dediquem. Un repàs ben col·locat val més que tres de seguits.",
    "Els docents ho saben des de fa dècades: les classes magistrals deixen una sensació de claredat que es dilueix en pocs dies si no hi ha cap activitat posterior de recuperació.",
];
const f = (n) => FILLER[n % 4];
const p = (s) => `<p>${s}</p>`;
const Q = QUOTES;

// Article llarg (serif, com un quadern de divulgació) amb les sis cites escampades perquè es vegi el scroll.
export const ARTICLE_HTML = `<!doctype html><html lang="ca"><head><meta charset="utf-8"><title>Per què oblidem gairebé tot el que llegim — Quadern de ciència</title>
<style>
html{scrollbar-width:none}body{margin:0;padding:38px 130px 400px 133px;font:24px/1.55 Georgia,'Times New Roman',serif;color:#1c1b1a;background:#fff}
h1,h2{font-family:system-ui,'Segoe UI',sans-serif;font-weight:700;letter-spacing:-.02em}
h1{font-size:34px;margin:0 0 28px}h2{font-size:29px;margin:56px 0 22px}p{margin:0 0 26px}
</style></head><body><article><h1>Per què oblidem gairebé tot el que llegim</h1>
${p(f(0))}${p(`${f(1)} ${Q[0]}. L'oblit és el funcionament normal de la memòria, no un defecte. Ebbinghaus va mesurar l'oblit en ell mateix amb síl·labes sense sentit.`)}
<h2>La corba de l'oblit</h2>
${p(`Ebbinghaus va publicar el seu treball el 1885. ${Q[1]}. ${f(2)}`)}
${p(`La corba mostra que la major part del que aprenem ${Q[2]}, i que després la pèrdua s'alenteix. ${f(3)}`)}
${p(f(0))}${p(f(1))}
<h2>Rellegir no és el mateix que recordar</h2>
${p(`Quan volem retenir alguna cosa, el primer impuls és rellegir-la o subratllar-la. Són estratègies còmodes, però donen una falsa sensació de domini: el text ens sembla familiar i ${Q[3]}.`)}
${p(f(2))}${p(f(3))}
${p(`La recerca en psicologia de l'aprenentatge apunta en una altra direcció. L'anomenat efecte del test mostra que intentar recuperar una informació de memòria, encara que costi i ens equivoquem, ${Q[4]}.`)}
${p(f(0))}
<h2>Espaiar el repàs</h2>
${p(`La segona clau és el temps. Repassar una mateixa idea diverses vegades en una sola tarda funciona pitjor que repassar-la en dies diferents. És la repetició espaiada: cada repàs arriba just quan estàvem a punt d'oblidar, i així ${Q[5]}.`)}
${p(f(1))}${p(f(2))}${p(f(3))}
</article></body></html>`;

export const SUMMARY = `Article de divulgació que explica per què oblidem tan de pressa el que llegim i què hi podem fer. Parteix de la corba de l'oblit d'Hermann Ebbinghaus (1885) i sosté que rellegir i subratllar donen una falsa sensació de domini. Conclou que intentar recordar i espaiar els repassos és el que fixa de debò el que aprenem.

### Punts clau
- L'oblit és el funcionament normal de la memòria, no un defecte: «${QUOTES[0]}»
- Ebbinghaus va mesurar l'oblit en ell mateix amb síl·labes sense sentit: «${QUOTES[1]}»
- Perdem la major part del que aprenem en poc temps; després, la pèrdua s'alenteix: «${QUOTES[2]}»
- Rellegir i subratllar fan que el text sembli conegut, però no vol dir que el sapiguem: «${QUOTES[3]}»
- Intentar recordar, encara que costi, fixa més que rellegir: «${QUOTES[4]}»
- Repassar en dies diferents aplana la corba: «${QUOTES[5]}»

### Aprenentatges
- En acabar un article, explica'n la idea principal sense mirar-lo.
- Apunta dues o tres preguntes i torna-hi d'aquí a uns dies.
- Relaciona el que llegeixes amb el que ja saps.`;

// Tots els plugins activats i tema «Flexoki clar» (fons crema), com a les captures del web.
const SETTINGS = {
    theme: "solarized", enableResum: true, enableSimple: true, enableDeepdive: true, enableScience: true,
    enableConceptMap: true, enablePdf: true, enableAnki: true, enableObsidian: true, enableMarkdown: true,
    enableBionic: true,
};

/**
 * @param {object} o
 * @param {string} o.articleHtml        HTML de l'article
 * @param {(prompt: string) => string} o.reply  text que «respon» Gemini a cada petició
 * @param {{width:number,height:number}} o.articleSize  viewport de la pestanya de l'article
 * @param {{width:number,height:number}} o.sideSize     viewport de la barra lateral
 */
export async function startSession({ articleHtml, reply, articleSize, sideSize }) {
    const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), "resumir-web-")), {
        headless: false,
        args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, "--headless=new"],
    });
    let [sw] = ctx.serviceWorkers();
    if (!sw) sw = await ctx.waitForEvent("serviceworker", { timeout: 15000 });
    const id = new URL(sw.url()).host;

    await ctx.route("https://generativelanguage.googleapis.com/**", async (route) => {
        if (!route.request().url().includes("streamGenerateContent")) {
            return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ models: [] }) });
        }
        await new Promise((r) => setTimeout(r, 400)); // sense retard el cronòmetre del peu surt a 0.0s
        const text = reply(route.request().postData() || "");
        const usageMetadata = { promptTokenCount: 1486, candidatesTokenCount: 412 };
        return route.fulfill({
            status: 200, contentType: "text/event-stream",
            body: `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata })}\n\n`,
        });
    });
    await ctx.route("https://quadern.example/**", (r) => r.fulfill({ status: 200, contentType: "text/html; charset=utf-8", body: articleHtml }));

    const art = await ctx.newPage();
    await art.setViewportSize(articleSize);
    await art.goto(ARTICLE_URL);
    const tab = await sw.evaluate(async () => (await chrome.tabs.query({ url: "https://quadern.example/*" }))[0]);
    await sw.evaluate((s) => chrome.storage.sync.set(s), SETTINGS);
    await sw.evaluate(() => chrome.storage.local.set({ apiKey: "AIzaTEST_KEY_1234567890123456789012345" }));

    // La barra lateral veu la pestanya de l'article com a activa (en una pestanya normal seria ella mateixa)
    const side = await ctx.newPage();
    await side.setViewportSize(sideSize);
    await side.addInitScript((t) => {
        const q = chrome.tabs.query.bind(chrome.tabs);
        chrome.tabs.query = async (info) => (info && info.active ? [t] : q(info));
    }, { id: tab.id, url: tab.url, title: tab.title, active: true, windowId: tab.windowId });
    await side.goto(`chrome-extension://${id}/sidebar/sidebar.html`);
    await side.addStyleTag({ content: "html,body,*{scrollbar-width:none!important}" });
    await side.waitForSelector("#idle-state", { state: "visible" });

    return { ctx, art, side, close: () => ctx.close() };
}

/** Captura amb DPR concret: page.screenshot() ignora Emulation.setDeviceMetricsOverride. */
export async function withMetrics(page, ctx) {
    const cdp = await ctx.newCDPSession(page);
    return {
        cdp,
        set: async (width, height, deviceScaleFactor) => {
            await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile: false });
            await page.waitForTimeout(500);
        },
        shot: async (format = "png", quality = 88) =>
            Buffer.from((await cdp.send("Page.captureScreenshot", { format, ...(format === "jpeg" ? { quality } : {}) })).data, "base64"),
    };
}

/** Falla si la barra d'eines es parteix en més d'una fila (cal ≥ ~500px d'ample). */
export async function assertToolbarOneLine(side, label) {
    const r = await side.$$eval(".toolbar button", (bs) => {
        const v = bs.filter((b) => b.offsetParent && b.getBoundingClientRect().width > 0);
        return { n: v.length, tops: [...new Set(v.map((b) => Math.round(b.getBoundingClientRect().top)))] };
    });
    console.log(`${label}: ${r.n} botons, files (top): ${JSON.stringify(r.tops)}`);
    if (r.tops.length !== 1) throw new Error(`La barra d'eines es parteix en dues files a «${label}»`);
}

/** Obre una pàgina en blanc al contexte per dibuixar/exportar imatges amb <canvas>. */
export async function canvasPage(ctx) {
    const page = await ctx.newPage();
    await page.setContent("<canvas id=c></canvas>");
    await page.evaluate(() => {
        window.__load = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    });
    return page;
}
