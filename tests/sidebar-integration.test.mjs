/**
 * tests/sidebar-integration.test.mjs
 * Tests d'integració de sidebar.js carregat de veritat (sidebar.html + scripts)
 * dins de jsdom. Cobreix comportament que no es pot provar important el mòdul.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSidebar } from "./helpers/sidebar-harness.mjs";

test("harness - la barra lateral es carrega i mostra la targeta d'onboarding sense clau", async () => {
    const h = await loadSidebar();
    try {
        assert.ok(h.document.querySelector(".api-key-warning-container"),
            "Sense clau ha de mostrar la targeta d'onboarding");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.15): l'enllaç «veure nova versió» de l'avís de prompt posava el
// flag *UpdateAvailable a false ABANS d'obrir Configuració, que només mostra
// el seu avís (mantenir/restaurar) si el flag és true: l'usuari no el veia mai.
// ---------------------------------------------------------------------------
test("avís de prompt nou - l'enllaç obre Configuració SENSE esborrar el flag (perquè hi surti l'avís)", async () => {
    const h = await loadSidebar({
        // Prompt d'aprofundiment personalitzat amb versió antiga: la migració de
        // càrrega aixeca el flag deepDivePromptUpdateAvailable (flux real).
        sync: {
            enableDeepdive: true,
            deepDivePrompt: "El meu prompt personalitzat",
            promptVersions: { deepDivePrompt: 1, sciencePrompt: 2, conceptMapPrompt: 2, simplePrompt: 1 },
        },
        local: { apiKey: "AIza_test" },
    });
    try {
        h.document.getElementById("deepDiveBtn").click();
        await h.flush();

        const banner = h.document.getElementById("prompt-update-notification");
        assert.ok(!banner.classList.contains("hidden"), "L'avís ha de ser visible");

        h.document.getElementById("prompt-update-link").click();
        await h.flush();

        assert.equal(h.calls.tabsCreate.length, 1, "Ha d'obrir Configuració");
        assert.match(h.calls.tabsCreate[0].url, /settings\.html#tab=deepdive$/, "…directament a la pestanya del prompt afectat");
        const { deepDivePromptUpdateAvailable } = await h.storage.sync.get("deepDivePromptUpdateAvailable");
        assert.equal(deepDivePromptUpdateAvailable, true,
            "El flag ha de seguir actiu perquè Configuració mostri l'avís de mantenir/restaurar");
        assert.ok(!banner.classList.contains("hidden"),
            "L'avís es manté per poder tornar-hi i continuar");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.1): el botó de lectura biònica re-renderitzava el resum com a
// text encara que el contingut fos el mapa conceptual, que es convertia en una
// llista i perdia l'SVG interactiu pagat en tokens.
// ---------------------------------------------------------------------------
test("biònica - activar/desactivar NO destrueix el mapa conceptual a pantalla", async () => {
    const h = await loadSidebar({
        sync: { enableConceptMap: true, enableBionic: true },
        local: { apiKey: "AIza_test" },
        pageText: "Un article llarg sobre ciència. ".repeat(20),
        modelReply: "- Ciència\n  - Mètode\n  - Dades",
    });
    try {
        h.document.getElementById("conceptMapBtn").click();
        await h.flush(30);

        const mapBefore = h.document.querySelector("#content .markmap-container");
        assert.ok(mapBefore, "Després de generar el mapa, ha de veure's el contenidor del mapa");

        const bionic = h.document.getElementById("bionicBtn");
        bionic.click();
        await h.flush(10);
        assert.ok(h.document.querySelector("#content .markmap-container"),
            "Activar la biònica no pot substituir el mapa per text");

        bionic.click();
        await h.flush(10);
        assert.ok(h.document.querySelector("#content .markmap-container"),
            "Desactivar-la tampoc");
    } finally { h.close(); }
});

test("biònica - amb un resum de text SÍ es re-renderitza (no és un no-op)", async () => {
    const h = await loadSidebar({
        sync: { enableBionic: true },
        local: { apiKey: "AIza_test" },
        pageText: "Un article llarg sobre ciència. ".repeat(20),
        modelReply: "Resum curt del contingut.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("content").textContent.includes("Resum curt"));

        h.document.getElementById("bionicBtn").click();
        await h.flush(10);
        assert.ok(h.document.querySelector("#content b, #content strong, #content .bionic"),
            "Amb la biònica activa el text ha de dur negretes");
        const bb = h.document.getElementById("bionicBtn");
        assert.equal(bb.getAttribute("aria-pressed"), "true");
        assert.match(bb.title, /activada/);
        bb.click();
        await h.flush(5);
        assert.equal(bb.getAttribute("aria-pressed"), "false");
        assert.match(bb.title, /desactivada/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Regressió (0.2): en obrir una entrada de l'Historial, currentMetadata no
// s'actualitzava; en tornar a la barra d'eines, Copiar exportava el resum
// anterior (el generat abans d'obrir l'Historial), no el que es veia.
// ---------------------------------------------------------------------------
function seedHistoryEntry() {
    const url = "https://altra.example/b";
    const key = `summary_cache:${url}:summary`;
    return {
        [key]: {
            url, title: "Pàgina B", summary: "Resum de l'altra pàgina B",
            model: "gemini-2.5-flash", timestamp: new Date().toISOString(),
            version: "1.0", stats: { input: 1, output: 1 }, type: "summary",
        },
        summary_cache_index: [key],
    };
}

test("historial - Copiar exporta l'entrada que es veu, no el resum anterior", async () => {
    const h = await loadSidebar({
        sync: { enableMarkdown: true },
        local: { apiKey: "AIza_test", ...seedHistoryEntry() },
        pageText: "Un article llarg. ".repeat(20),
        modelReply: "Resum A (el que es va generar abans)",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("content").textContent.includes("Resum A"));

        // Obre l'Historial i carrega l'entrada B
        h.document.getElementById("historyBtn").click();
        await h.flush(10);
        const item = [...h.document.querySelectorAll("#history-panel .history-item")]
            .find(li => li.textContent.includes("Pàgina B"));
        assert.ok(item, "L'entrada B ha de sortir a l'Historial");
        item.click();
        await h.flush(10);
        assert.ok(h.document.getElementById("content").textContent.includes("altra pàgina B"));

        // Torna a la barra d'eines passant per l'Historial (camí del bug)
        h.document.getElementById("historyBackBtn").click();
        await h.flush(10);
        h.document.querySelector("#history-panel .history-back-btn").click();
        await h.flush(10);

        h.document.getElementById("copyBtn").click();
        await h.flush(10);

        assert.equal(h.calls.clipboard.length, 1, "Ha de copiar alguna cosa");
        assert.ok(h.calls.clipboard[0].includes("altra pàgina B"),
            `Ha de copiar l'entrada visible, ha copiat: ${h.calls.clipboard[0]}`);
        assert.ok(!h.calls.clipboard[0].includes("Resum A"), "No ha de copiar el resum anterior");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// L3: la regió d'estat per a lectors de pantalla. El contingut en streaming no
// és una regió activa (es llegiria a trossos); #sr-status, present i buida des
// de la càrrega, anuncia només el cicle de vida.
// ---------------------------------------------------------------------------
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

test("regió d'estat - existeix, és polida i està buida en carregar", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        const el = h.document.getElementById("sr-status");
        assert.ok(el, "Ha d'existir #sr-status des de la càrrega");
        assert.equal(el.getAttribute("role"), "status");
        assert.equal(el.getAttribute("aria-live"), "polite");
        assert.equal(el.textContent, "");
        assert.ok(!h.document.getElementById("content").hasAttribute("aria-live"),
            "El contingut en streaming no pot ser una regió activa");
    } finally { h.close(); }
});

test("regió d'estat - anuncia «Resum complet» en acabar una generació", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        await sleep(250); // l'anunci s'escriu 100 ms després de buidar la regió
        assert.match(h.document.getElementById("sr-status").textContent, /Resum complet/);
    } finally { h.close(); }
});

test("avís de prompt nou - «de» s'apostrofa davant de vocal («d'aprofundiment»)", async () => {
    const h = await loadSidebar({
        sync: {
            enableDeepdive: true,
            deepDivePrompt: "El meu prompt",
            promptVersions: { deepDivePrompt: 1, sciencePrompt: 2, conceptMapPrompt: 2, simplePrompt: 1 },
        },
        local: { apiKey: "AIza_test" },
    });
    try {
        h.document.getElementById("deepDiveBtn").click();
        await h.flush();
        const text = h.document.getElementById("prompt-update-text").textContent;
        assert.match(text, /prompt d'aprofundiment/);
        assert.doesNotMatch(text, /de aprofundiment/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Historial (H5/H6): era un <li role=button> amb <span role=button> a dins
// (interactius niats: els interns quedaven inaccessibles) i el focus es perdia
// en obrir/tancar el panell o una entrada.
// ---------------------------------------------------------------------------
function seedTwoTypes() {
    const url = "https://altra.example/b";
    const mk = (type, summary) => ({
        url, title: "Pàgina B", summary, model: "m",
        timestamp: new Date().toISOString(), version: "1.0", stats: { input: 1, output: 1 }, type,
    });
    const k1 = `summary_cache:${url}:summary`, k2 = `summary_cache:${url}:deepdive`;
    return { [k1]: mk("summary", "Resum B"), [k2]: mk("deepdive", "Aprofundiment B"), summary_cache_index: [k1, k2] };
}

test("historial - sense interactius niats: botons reals germans dins d'un <li> no interactiu", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedTwoTypes() } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        const li = h.document.querySelector("#history-panel .history-item");
        assert.ok(li);
        assert.notEqual(li.getAttribute("role"), "button", "L'<li> no ha de ser role=button");
        assert.equal(li.querySelectorAll('[role="button"]').length, 0, "Cap role=button niat");
        assert.equal(li.querySelector(".history-item-title").tagName, "BUTTON");
        const icons = [...li.querySelectorAll(".type-icon")];
        assert.equal(icons.length, 2);
        for (const i of icons) {
            assert.equal(i.tagName, "BUTTON");
            assert.match(i.getAttribute("aria-label"), /Pàgina B/, "El nom accessible diu de quina entrada és");
            assert.equal(i.closest("button.history-item-title"), null, "No pot ser dins d'un altre botó");
        }
    } finally { h.close(); }
});

test("historial - el focus va a l'encapçalament en obrir el panell i torna al botó en tancar-lo", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedTwoTypes() } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        assert.equal(h.document.activeElement, h.document.getElementById("history-heading"));
        h.document.querySelector("#history-panel .history-back-btn").click();
        await h.flush();
        assert.equal(h.document.activeElement, h.document.getElementById("historyBtn"));
    } finally { h.close(); }
});

test("historial - triar una icona de tipus obre aquell tipus i deixa el focus a «Tornar a l'historial»", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedTwoTypes() } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        h.document.querySelector('#history-panel .type-icon[data-type="deepdive"]').click();
        await h.flush();
        assert.match(h.document.getElementById("content").textContent, /Aprofundiment B/);
        assert.equal(h.document.activeElement, h.document.getElementById("historyBackBtn"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Mapa conceptual (M1/M2): l'SVG no tenia semàntica (buit per a un lector),
// els nodes plegables no deien si estaven oberts, i en plegar/desplegar es
// reconstruïa tot l'SVG i el focus del teclat es perdia.
// ---------------------------------------------------------------------------
async function generateMap(h) {
    h.document.getElementById("conceptMapBtn").click();
    await h.flush(30);
    return h.document.querySelector("#content .markmap-container");
}
const mapOptions = () => ({
    sync: { enableConceptMap: true },
    local: { apiKey: "AIza_test" },
    pageText: "Un article. ".repeat(30),
    modelReply: "- Ciència\n  - Mètode\n    - Hipòtesi\n  - Dades",
});

test("mapa - l'SVG té rol d'imatge amb nom, i hi ha una vista de llista equivalent", async () => {
    const h = await loadSidebar(mapOptions());
    try {
        const container = await generateMap(h);
        assert.ok(container);
        const svg = container.querySelector("svg[role='img']");
        assert.ok(svg, "L'SVG principal ha de ser role=img");
        assert.match(svg.getAttribute("aria-label"), /Mapa conceptual/);
        assert.match(svg.getAttribute("aria-label"), /llista/);

        const listBtn = h.document.querySelector("#content .markmap-list-btn");
        assert.ok(listBtn, "Ha d'haver-hi un botó de vista de llista");
        const listView = h.document.querySelector("#content .markmap-list");
        assert.ok(listView.classList.contains("hidden"), "Comença en vista de mapa");

        listBtn.click();
        assert.ok(!listView.classList.contains("hidden"));
        assert.ok(container.classList.contains("hidden"), "El mapa s'amaga en veure la llista");
        assert.equal(listBtn.getAttribute("aria-pressed"), "true");
        assert.match(listView.textContent, /Ciència/);
        assert.match(listView.textContent, /Mètode/);
        assert.ok(listView.querySelector("details, li"), "La llista ha de ser estructura real (details/li)");

        listBtn.click();
        assert.ok(listView.classList.contains("hidden"));
        assert.ok(!container.classList.contains("hidden"));
    } finally { h.close(); }
});

test("mapa - els botons de plegar diuen si el node és obert (aria-expanded)", async () => {
    const h = await loadSidebar(mapOptions());
    try {
        await generateMap(h);
        await h.flush(10);
        const toggles = [...h.document.querySelectorAll("#content .markmap-toggle")];
        assert.ok(toggles.length > 0, "Hi ha d'haver nodes amb fills");
        for (const t of toggles) {
            assert.ok(["true", "false"].includes(t.getAttribute("aria-expanded")));
            assert.match(t.getAttribute("aria-label"), /^(Desplegar|Plegar)/);
        }
    } finally { h.close(); }
});

test("mapa - plegar/desplegar un node manté el focus al seu botó (l'SVG es reconstrueix)", async () => {
    const h = await loadSidebar(mapOptions());
    try {
        await generateMap(h);
        await h.flush(10);
        const first = h.document.querySelector("#content .markmap-toggle");
        const label = first.getAttribute("aria-label").replace(/^(Desplegar|Plegar)/, "");
        const before = first.getAttribute("aria-expanded");
        first.focus();
        first.dispatchEvent(new h.window.Event("click", { bubbles: true }));
        await h.flush(5);
        const active = h.document.activeElement;
        assert.ok(active && active.classList && active.classList.contains("markmap-toggle"),
            "El focus ha de quedar en un botó de plegar, no a <body>");
        assert.ok(active.getAttribute("aria-label").endsWith(label), "…i és el del mateix node");
        assert.notEqual(active.getAttribute("aria-expanded"), before, "L'estat ha canviat");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Onboarding dins del panell (2.2): 3 passos, camp per enganxar la clau,
// comprovació real abans de desar i missatges accionables per codi d'error.
// ---------------------------------------------------------------------------
async function typeKeyAndVerify(h, key) {
    const input = h.document.getElementById("apiKeyInput");
    input.value = key;
    h.document.getElementById("verifyApiKeyBtn").click();
    await h.flush(15);
}

test("onboarding - mostra els 3 passos, el camp de la clau i la nota de privacitat", async () => {
    const h = await loadSidebar();
    try {
        const card = h.document.querySelector(".api-key-warning-container");
        assert.ok(card);
        assert.equal(card.querySelectorAll("ol.api-key-steps li").length, 3);
        const input = h.document.getElementById("apiKeyInput");
        assert.equal(input.type, "password", "La clau s'amaga per defecte");
        assert.ok(input.getAttribute("aria-label"));
        assert.match(card.textContent, /només en aquest navegador/);
        assert.match(card.textContent, /s'envia a Google Gemini/);
        assert.equal(h.document.getElementById("apiKeyStatus").getAttribute("role"), "status");
    } finally { h.close(); }
});

test("onboarding - mostrar/amagar la clau commuta el tipus i l'estat", async () => {
    const h = await loadSidebar();
    try {
        const input = h.document.getElementById("apiKeyInput");
        const btn = h.document.querySelector(".api-key-show");
        btn.click();
        assert.equal(input.type, "text");
        assert.equal(btn.getAttribute("aria-pressed"), "true");
        btn.click();
        assert.equal(input.type, "password");
    } finally { h.close(); }
});

test("onboarding - una clau vàlida es comprova (per capçalera) i es desa", async () => {
    const h = await loadSidebar({ fetchHandler: async () => ({ status: 200 }) });
    try {
        await typeKeyAndVerify(h, '  "AIza' + "x".repeat(35) + '"  ');
        const { apiKey } = await h.storage.local.get("apiKey");
        assert.equal(apiKey, "AIza" + "x".repeat(35), "Es desa neta (sense espais ni cometes)");
        const call = h.calls.fetches.find(f => String(f.url).includes("generativelanguage"));
        assert.ok(call, "S'ha de comprovar contra Google");
        assert.equal(call.headers["x-goog-api-key"], "AIza" + "x".repeat(35));
        assert.ok(!String(call.url).includes("AIza"), "La clau no va a la URL");
    } finally { h.close(); }
});

test("onboarding - una clau incorrecta (400) NO es desa i diu què fer", async () => {
    const h = await loadSidebar({ fetchHandler: async () => ({ status: 400 }) });
    try {
        await typeKeyAndVerify(h, "AIzaMALA");
        const { apiKey } = await h.storage.local.get("apiKey");
        assert.equal(apiKey, undefined, "No es pot desar una clau que no funciona");
        assert.match(h.document.getElementById("apiKeyStatus").textContent, /no és vàlida/);
        assert.equal(h.document.getElementById("verifyApiKeyBtn").disabled, false, "Es pot tornar a provar");
        assert.equal(h.document.activeElement, h.document.getElementById("apiKeyInput"), "El focus torna al camp");
    } finally { h.close(); }
});

test("onboarding - límit gratuït (429) i error de xarxa donen missatges diferents i accionables", async () => {
    let h = await loadSidebar({ fetchHandler: async () => ({ status: 429 }) });
    try {
        await typeKeyAndVerify(h, "AIzaX");
        assert.match(h.document.getElementById("apiKeyStatus").textContent, /límit gratuït/);
    } finally { h.close(); }
    h = await loadSidebar({ fetchHandler: async () => { throw new TypeError("offline"); } });
    try {
        await typeKeyAndVerify(h, "AIzaX");
        assert.match(h.document.getElementById("apiKeyStatus").textContent, /connexió/);
        assert.equal((await h.storage.local.get("apiKey")).apiKey, undefined);
    } finally { h.close(); }
});

test("onboarding - un camp buit no fa cap petició", async () => {
    const h = await loadSidebar({ fetchHandler: async () => ({ status: 200 }) });
    try {
        await typeKeyAndVerify(h, "   ");
        assert.equal(h.calls.fetches.filter(f => String(f.url).includes("generativelanguage")).length, 0);
        assert.match(h.document.getElementById("apiKeyStatus").textContent, /Enganxa primer la clau/);
    } finally { h.close(); }
});

test("onboarding - Enter al camp comprova la clau", async () => {
    const h = await loadSidebar({ fetchHandler: async () => ({ status: 200 }) });
    try {
        const input = h.document.getElementById("apiKeyInput");
        input.value = "AIza" + "y".repeat(35);
        input.dispatchEvent(new h.window.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
        await h.flush(15);
        assert.equal((await h.storage.local.get("apiKey")).apiKey, "AIza" + "y".repeat(35));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// 2.3: l'extracció d'un PDF local pot trigar; ha de mostrar l'estat de càrrega,
// bloquejar els botons i NO canviar el títol fins que s'ha llegit el fitxer.
// ---------------------------------------------------------------------------
async function pickPdf(h, name = "informe.pdf", extraBytes = 0) {
    const input = h.document.getElementById("pdfFileInput");
    const file = new h.window.File([new Uint8Array(4 + extraBytes)], name, { type: "application/pdf" });
    if (!file.arrayBuffer) file.arrayBuffer = async () => new Uint8Array([37, 80, 68, 70]).buffer;
    Object.defineProperty(input, "files", { value: [file], configurable: true });
    input.dispatchEvent(new h.window.Event("change", { bubbles: true }));
    await h.flush(3);
}

test("PDF local - mentre s'extreu: càrrega visible, botons bloquejats i títol sense canviar", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" }, sync: { enablePdf: true }, modelReply: "Resum del PDF." });
    try {
        let release;
        h.window.extractPdfText = () => new Promise(res => { release = () => res({ title: "Informe", text: "Text. ".repeat(40) }); });
        await pickPdf(h);

        assert.ok(!h.document.getElementById("loading").classList.contains("hidden"));
        assert.match(h.document.getElementById("loading-text").textContent, /Llegint el PDF/);
        assert.equal(h.document.getElementById("summarizeBtn").disabled, true);
        assert.equal(h.document.getElementById("selectPdfBtn").disabled, true, "No es pot triar un altre fitxer mentrestant");
        assert.ok(h.document.getElementById("page-title-strip").classList.contains("hidden"),
            "El títol no ha de canviar abans d'haver llegit el fitxer");

        release();
        await h.flush(30);
        assert.equal(h.document.getElementById("summarizeBtn").disabled, false, "Es desbloquegen en acabar");
        assert.equal(h.document.getElementById("page-title-link").textContent, "Informe");
    } finally { h.close(); }
});

test("PDF local - si l'extracció falla: error visible, botons desbloquejats i títol intacte", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" }, sync: { enablePdf: true } });
    try {
        h.window.extractPdfText = async () => { throw Object.assign(new Error("x"), { code: "PASSWORD" }); };
        await pickPdf(h);
        await h.flush(10);
        assert.match(h.document.getElementById("error").textContent, /contrasenya/);
        assert.equal(h.document.getElementById("summarizeBtn").disabled, false);
        assert.ok(h.document.getElementById("page-title-strip").classList.contains("hidden"));
        assert.ok(h.document.getElementById("loading").classList.contains("hidden"));
    } finally { h.close(); }
});

test("l'avís i l'error surten ABANS del contingut al DOM (no al final d'un text llarg)", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        const order = [...h.document.getElementById("container").children].map(el => el.id);
        assert.ok(order.indexOf("error") < order.indexOf("content"), `ordre: ${order.join(" > ")}`);
        assert.ok(order.indexOf("model-notice") < order.indexOf("content"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Historial útil (2.6): cerca, esborrar per entrada amb «Desfer», estat buit
// que explica la retenció i dates llegibles.
// ---------------------------------------------------------------------------
function seedEntries(specs) {
    const local = { summary_cache_index: [] };
    for (const { url, title, type = "summary", ageDays = 0 } of specs) {
        const key = `summary_cache:${url}:${type}`;
        local[key] = {
            url, title, summary: `Resum de ${title}`, model: "m",
            timestamp: new Date(Date.now() - ageDays * 86400000).toISOString(),
            version: "1.0", stats: { input: 1, output: 1 }, type,
        };
        local.summary_cache_index.push(key);
    }
    return local;
}
const items = (h) => [...h.document.querySelectorAll("#history-panel .history-item")];
const typeInto = (h, el, value) => { el.value = value; el.dispatchEvent(new h.window.Event("input", { bubbles: true })); };

test("historial - estat buit: explica com s'omple i quant es guarda", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        const text = h.document.getElementById("history-panel").textContent;
        assert.match(text, /Aquí apareixeran els resums que generis/);
        assert.match(text, /\d+ dies, només en aquest navegador/);
        assert.equal(h.document.querySelector(".history-search"), null, "Sense entrades no cal cercador");
    } finally { h.close(); }
});

test("historial - la cerca filtra per títol o adreça i anuncia el recompte", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedEntries([
        { url: "https://a.example/ciencia", title: "Notícia de ciència" },
        { url: "https://b.example/esports", title: "Resum d'esports" },
        { url: "https://c.example/cuina", title: "Recepta" },
    ]) } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        assert.equal(items(h).length, 3);
        const search = h.document.querySelector(".history-search");
        assert.ok(search.getAttribute("aria-label"));

        typeInto(h, search, "ciència");
        assert.equal(items(h).length, 1);
        assert.match(items(h)[0].textContent, /Notícia de ciència/);
        assert.match(h.document.querySelector("#history-panel [role='status']").textContent, /1 resultat/);

        typeInto(h, search, "b.example"); // per adreça
        assert.equal(items(h).length, 1);

        typeInto(h, search, "zzz");
        assert.equal(items(h).length, 0);
        assert.match(h.document.getElementById("history-panel").textContent, /Cap resultat/);

        typeInto(h, search, "");
        assert.equal(items(h).length, 3);
    } finally { h.close(); }
});

test("historial - esborrar una entrada l'elimina (tots els tipus) i es pot desfer", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedEntries([
        { url: "https://a.example/x", title: "Pàgina A", type: "summary" },
        { url: "https://a.example/x", title: "Pàgina A", type: "deepdive" },
        { url: "https://b.example/y", title: "Pàgina B" },
    ]) } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        assert.equal(items(h).length, 2);
        const itemA = items(h).find(li => li.textContent.includes("Pàgina A"));
        const del = itemA.querySelector(".history-delete");
        assert.match(del.getAttribute("aria-label"), /Pàgina A/);

        del.click();
        await h.flush();
        assert.equal(items(h).length, 1, "L'entrada A ja no surt");
        const keys = Object.keys(await h.storage.local.get(null)).filter(k => k.startsWith("summary_cache:"));
        assert.equal(keys.length, 1, "S'han esborrat els dos tipus d'A");
        const toast = h.document.getElementById("history-toast");
        assert.ok(!toast.classList.contains("hidden"));
        assert.match(toast.textContent, /Entrada esborrada/);

        toast.querySelector(".history-undo").click();
        await h.flush();
        assert.equal(items(h).length, 2, "Desfer torna l'entrada");
        const after = Object.keys(await h.storage.local.get(null)).filter(k => k.startsWith("summary_cache:"));
        assert.equal(after.length, 3, "I els dos tipus d'A");
        const idx = (await h.storage.local.get("summary_cache_index")).summary_cache_index;
        assert.equal(idx.length, 3);
    } finally { h.close(); }
});

test("historial - desfer conserva la data original de l'entrada", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedEntries([{ url: "https://a.example/x", title: "Antiga", ageDays: 10 }]) } });
    try {
        const before = (await h.storage.local.get("summary_cache:https://a.example/x:summary"))["summary_cache:https://a.example/x:summary"].timestamp;
        h.document.getElementById("historyBtn").click();
        await h.flush();
        items(h)[0].querySelector(".history-delete").click();
        await h.flush();
        h.document.querySelector(".history-undo").click();
        await h.flush();
        const after = (await h.storage.local.get("summary_cache:https://a.example/x:summary"))["summary_cache:https://a.example/x:summary"].timestamp;
        assert.equal(after, before);
    } finally { h.close(); }
});

test("historial - data relativa fins a una setmana i absoluta (amb títol complet) després", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedEntries([
        { url: "https://a.example/ara", title: "Ara", ageDays: 0 },
        { url: "https://b.example/ahir", title: "Ahir", ageDays: 1 },
        { url: "https://c.example/vella", title: "Vella", ageDays: 20 },
    ]) } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        const meta = (title) => items(h).find(li => li.textContent.includes(title)).querySelector(".history-item-meta");
        assert.equal(meta("Ara").textContent, "ara mateix");
        assert.equal(meta("Ahir").textContent, "ahir");
        assert.doesNotMatch(meta("Vella").textContent, /^fa \d+ dies$/, "Passada una setmana, data absoluta");
        assert.ok(meta("Vella").title.length > 0, "El títol de l'element té la data completa");
    } finally { h.close(); }
});

// Enllaços profunds des de la barra lateral cap a la configuració
test("«Configurar» d'un error de clau obre la configuració ja sobre el camp de la clau", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        fetchHandler: async () => ({ ok: false, status: 403, statusText: "Forbidden", json: async () => ({ error: { message: "bad" } }), headers: { get: () => null } }),
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const btn = h.document.querySelector("#error button");
        assert.ok(btn, "L'error de clau ha d'oferir el botó «Configurar»");
        btn.click();
        assert.match(h.calls.tabsCreate.at(-1).url, /settings\.html#tab=general&focus=apiKey$/);
    } finally { h.close(); }
});

test("el botó de configuració de la barra continua obrint-la tal qual (sense destí)", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        h.document.getElementById("settingsBtn").click();
        assert.equal(h.calls.openOptionsPage, 1);
        assert.equal(h.calls.tabsCreate.length, 0);
    } finally { h.close(); }
});

test("Obsidian - sense ruta desada s'usa la neutra per defecte (no la personal de l'autor)", async () => {
    const h = await loadSidebar({
        sync: { enableObsidian: true, obsidianVault: "MeuVault" },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        h.document.getElementById("obsidianBtn").click();
        await h.flush(10);
        const url = h.calls.tabsCreate.at(-1).url;
        assert.match(url, /^obsidian:\/\/new\?vault=MeuVault&file=Resumir%2F\d{4}-\d{2}-\d{2}/);
        assert.doesNotMatch(decodeURIComponent(url), /4 Arxiu/);
    } finally { h.close(); }
});

test("copiar Markdown - sense plantilla desada usa la plantilla per defecte compartida", async () => {
    const h = await loadSidebar({
        sync: { enableMarkdown: true },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum complet.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        h.document.getElementById("copyBtn").click();
        await h.flush(10);
        assert.match(h.calls.clipboard[0], /^# \[Article\]\(https:\/\/example\.com\/article\)\n\nEl resum complet\./);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Historial (2.6): filtre per tipus. Amb molts resums, els mapes i les targetes
// s'amagaven darrere d'icones diminutes.
// ---------------------------------------------------------------------------
test("historial - el filtre per tipus mostra només les entrades d'aquell tipus", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedEntries([
        { url: "https://a.example/1", title: "Només resum", type: "summary" },
        { url: "https://b.example/2", title: "Amb mapa", type: "summary" },
        { url: "https://b.example/2", title: "Amb mapa", type: "conceptmap" },
    ]) } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        const filters = [...h.document.querySelectorAll("#history-panel .history-filter")];
        assert.ok(filters.length >= 3, "«Tots» + un botó per cada tipus present");
        assert.ok(filters.every(b => b.tagName === "BUTTON" && b.hasAttribute("aria-pressed")));
        assert.equal(filters[0].getAttribute("aria-pressed"), "true", "«Tots» actiu al principi");
        const map = filters.find(b => b.dataset.type === "conceptmap");
        map.click();
        assert.equal(items(h).length, 1);
        assert.match(items(h)[0].textContent, /Amb mapa/);
        assert.equal(h.document.querySelector('#history-panel .history-filter[data-type="conceptmap"]').getAttribute("aria-pressed"), "true");
        h.document.querySelector("#history-panel .history-filter").click(); // Tots
        assert.equal(items(h).length, 2);
    } finally { h.close(); }
});

test("historial - sense varietat de tipus no es mostra el filtre", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedEntries([
        { url: "https://a.example/1", title: "Un", type: "summary" },
    ]) } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush();
        assert.equal(h.document.querySelector("#history-panel .history-filter"), null);
    } finally { h.close(); }
});

// Dos fitxers diferents amb el mateix nom (document.pdf) es trepitjaven a la
// memòria cau perquè la clau era només el nom.
test("PDF local - dos fitxers amb el mateix nom però mida diferent no es trepitgen", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" }, sync: { enablePdf: true }, modelReply: "Resum." });
    try {
        h.window.extractPdfText = async () => ({ title: "Doc", text: "Text. ".repeat(40) });
        await pickPdf(h, "document.pdf", 0);
        await h.flush(30);
        await pickPdf(h, "document.pdf", 10);
        await h.flush(30);
        const keys = Object.keys(await h.storage.local.get(null)).filter(k => k.startsWith("summary_cache:pdf-local:"));
        assert.equal(keys.length, 2, `Claus: ${keys.join(", ")}`);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Estat en repòs (2.2): amb la clau configurada, el panell s'obria en blanc.
// Ara mostra la pàgina activa, un botó per resumir-la i els resums ja desats.
// ---------------------------------------------------------------------------
test("estat en repòs - mostra el títol de la pestanya, el botó de resumir i els resums desats", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...seedEntries([
            { url: "https://example.com/article", title: "Article", type: "summary" },
            { url: "https://example.com/article", title: "Article", type: "conceptmap" },
        ]) },
        tabs: [{ id: 1, url: "https://example.com/article", title: "El meu article", active: true }],
    });
    try {
        await h.flush(10);
        const idle = h.document.getElementById("idle-state");
        assert.ok(idle, "Ha d'existir #idle-state");
        assert.equal(idle.hidden, false);
        assert.match(h.document.getElementById("idle-title").textContent, /El meu article/);
        const saved = [...idle.querySelectorAll("#idle-saved button")];
        assert.equal(saved.length, 2, "Un botó per cada resum desat");
        saved[0].click();
        await h.flush(10);
        assert.match(h.document.getElementById("content").textContent, /Resum de Article/);
    } finally { h.close(); }
});

test("estat en repòs - el botó «Resumir aquesta pàgina» llança el resum", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" }, pageText: "Un article llarg sobre ciència. ".repeat(20), modelReply: "Resum nou." });
    try {
        await h.flush(10);
        h.document.getElementById("idle-summarize").click();
        await h.flush(30);
        assert.match(h.document.getElementById("content").textContent, /Resum nou/);
    } finally { h.close(); }
});

test("estat en repòs - sense pàgina web (chrome://…) s'amaga", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" }, tabs: [{ id: 1, url: "chrome://extensions", title: "Extensions", active: true }] });
    try {
        await h.flush(10);
        assert.equal(h.document.getElementById("idle-state").hidden, true);
        assert.equal(h.document.getElementById("idle-unsupported").hidden, false, "missatge en lloc d'un panell en blanc");
        assert.match(h.document.querySelector("#idle-unsupported .idle-title").textContent, /pàgina web/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Línia de procedència (Fase E): sota el resum, de què es basa i amb què s'ha fet
// ---------------------------------------------------------------------------

test("procedència - mostra paraules, model i tokens sota el resum", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "paraula ".repeat(1200),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const el = h.document.getElementById("provenance");
        assert.ok(el && !el.classList.contains("hidden"), "la línia és visible");
        assert.match(el.textContent, /Basat en 1\.200 paraules/);
        assert.match(el.textContent, /tokens/);
        assert.doesNotMatch(el.textContent, /tallat|truncat/i);
    } finally { h.close(); }
});

test("procedència - avisa quan el text s'ha tallat (PDF llarg)", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "paraula ".repeat(300),
        pageExtra: { truncated: true },
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const el = h.document.getElementById("provenance");
        assert.match(el.textContent, /text tallat/i);
        assert.ok(el.classList.contains("is-warning"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Pestanyes per tipus (Fase E): els resums desats de la pàgina, sota el títol
// ---------------------------------------------------------------------------
function seedTypes(url, types) {
    const local = { summary_cache_index: [] };
    for (const type of types) {
        const key = `summary_cache:${url}:${type}`;
        local[key] = {
            url, title: "Article", summary: `Text de ${type}`, model: "gemini-2.5-flash",
            timestamp: new Date().toISOString(), version: "1.0", stats: { input: 1, output: 1 }, type,
        };
        local.summary_cache_index.push(key);
    }
    return local;
}

test("pestanyes per tipus - llisten els resums desats i en canvien el contingut", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...seedTypes("https://example.com/article", ["summary", "deepdive"]) },
    });
    try {
        await h.flush(30);
        await sleep(250);
        const bar = h.document.getElementById("type-tabs");
        assert.equal(bar.getAttribute("role"), "group");
        const tabs = [...bar.querySelectorAll(".type-tab")];
        assert.equal(tabs.length, 2);
        assert.ok(tabs.every(t => t.hasAttribute("aria-pressed")));

        const deep = tabs.find(t => t.dataset.type === "deepdive");
        deep.click();
        await h.flush(30);
        assert.match(h.document.getElementById("content").textContent, /Text de deepdive/);
        await sleep(250);
        const after = [...bar.querySelectorAll(".type-tab")];
        assert.equal(after.find(t => t.dataset.type === "deepdive").getAttribute("aria-pressed"), "true");
        assert.equal(after.find(t => t.dataset.type === "summary").getAttribute("aria-pressed"), "false");
    } finally { h.close(); }
});

test("pestanyes per tipus - amagades si la pàgina no té res desat", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        await h.flush(30);
        await sleep(250);
        assert.ok(h.document.getElementById("type-tabs").classList.contains("hidden"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Avís de resum d'una altra pàgina (Fase E): la barra lateral és global per finestra
// ---------------------------------------------------------------------------
test("avís de resum antic - en canviar de pestanya ofereix resumir la nova", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const banner = h.document.getElementById("stale-banner");
        assert.ok(banner.classList.contains("hidden"), "mateixa pàgina: sense avís");

        const other = { id: 2, url: "https://altra.example/x", title: "Altra pàgina", active: true };
        h.window.chrome.tabs.onUpdated._fire(2, { url: other.url }, other);
        await h.flush();
        assert.ok(!banner.classList.contains("hidden"));
        assert.match(banner.textContent, /Aquest resum és de «Article»/);

        h.window.chrome.tabs.onUpdated._fire(1, { url: "https://example.com/article" }, { id: 1, url: "https://example.com/article", title: "Article", active: true });
        await h.flush();
        assert.ok(banner.classList.contains("hidden"), "en tornar, l'avís desapareix");
    } finally { h.close(); }
});

test("procedència - detecta un bàner de galetes i ofereix veure el text enviat", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Fem servir cookies. Accepta les cookies o gestiona el consentiment de cookies. ".repeat(4),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const el = h.document.getElementById("provenance");
        assert.match(el.textContent, /avís de galetes/);
        assert.ok(el.classList.contains("is-warning"));
        el.querySelector("button").click();
        await h.flush();
        assert.ok(!h.document.getElementById("source-panel").classList.contains("hidden"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Botó de tornar (historial/text enviat): visible i fix, no un text gris que
// surt de pantalla en un resum llarg. (jsdom no calcula layout: es comprova el CSS.)
// ---------------------------------------------------------------------------
test("botó de tornar - barra fixa a dalt i botó amb vora i contrast", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync(new URL("../sidebar/sidebar.css", import.meta.url), "utf8");
    const rule = (sel) => css.match(new RegExp(sel.replace(/[.#]/g, "\\$&") + "\\s*\\{([^}]*)\\}"))?.[1] || "";
    assert.match(rule("#history-back-bar"), /position:\s*sticky/);
    const btn = rule(".history-back-btn");
    assert.match(btn, /border:\s*1px/);
    assert.match(btn, /color:\s*var\(--text-color\)/, "no en gris atenuat");
    assert.match(btn, /min-height:\s*32px/);
    assert.match(rule(".history-header"), /position:\s*sticky/);
});

test("botó de tornar - etiquetes que diuen on tornes", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedHistoryEntry() } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush(30);
        assert.match(h.document.querySelector("#history-panel .history-back-btn").textContent, /Tancar l'historial/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Pàgines als PDF (Fase E): «(p. N)» al resum enllaça amb la pàgina del PDF
// ---------------------------------------------------------------------------
test("pàgines de PDF - les cites (p. N) són enllaços #page=N i el prompt les demana", async () => {
    const url = "https://example.com/doc.pdf";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        tabs: [{ id: 1, url, title: "Doc", active: true }],
        pageText: "[Pàgina 1]\n" + "text ".repeat(80) + "\n\n[Pàgina 3]\n" + "més ".repeat(80),
        modelReply: "Idea clau (p. 3).",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const a = h.document.querySelector("#content a[data-pdf-page]");
        assert.ok(a, "ha d'haver-hi un enllaç de pàgina");
        assert.equal(a.getAttribute("href"), url + "#page=3");
        assert.match(h.calls.fetches[0].body, /\(p\. N\)/);
    } finally { h.close(); }
});

test("pàgines de PDF - una pàgina web normal no porta enllaços ni instrucció", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "Idea clau (p. 3).",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.document.querySelector("#content a[data-pdf-page]"), null);
        assert.doesNotMatch(h.calls.fetches[0].body, /\(p\. N\)/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Segells de temps a YouTube (Fase E): [m:ss] al resum porta el vídeo a l'instant
// ---------------------------------------------------------------------------
test("YouTube - les marques [m:ss] són enllaços, el prompt les demana i el clic fa seek", async () => {
    const url = "https://www.youtube.com/watch?v=abc123XYZ_0";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        tabs: [{ id: 1, url, title: "Vídeo", active: true }],
        pageText: "[TRANSCRIPT: ca]\n\n[0:00] " + "hola ".repeat(80) + "[1:05] " + "adéu ".repeat(80),
        modelReply: "Primera idea [1:05]. Segona [1:02:03].",
    });
    try {
        const execs = [];
        h.window.chrome.scripting.executeScript = async (inj) => { execs.push(inj); return []; };
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const links = [...h.document.querySelectorAll("#content a[data-yt-time]")];
        assert.deepEqual(links.map(a => a.dataset.ytTime), ["65", "3723"]);
        assert.equal(links[0].getAttribute("href"), "https://www.youtube.com/watch?v=abc123XYZ_0&t=65s");
        assert.match(h.calls.fetches[0].body, /\[m:ss\]/);

        links[0].click();
        await h.flush(10);
        assert.equal(execs.length, 1);
        assert.equal(h.calls.tabsCreate.length, 0, "moure el vídeo d'aquesta pestanya no ha d'obrir també una pestanya nova");
        assert.equal(JSON.stringify(execs[0].args), "[65]");
    } finally { h.close(); }
});

test("Anki - un array buit del model diu que no hi ha prou contingut (no «torna a generar»)", async () => {
    const h = await loadSidebar({
        sync: { enableAnki: true },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "[]",
    });
    try {
        h.document.getElementById("ankiBtn").click();
        await h.flush(30);
        assert.match(h.document.getElementById("error").textContent, /No hi ha prou contingut per fer targetes/);
    } finally { h.close(); }
});

test("instruccions de cites - indiquen el número de la marca, una cita per pàgina i res d'intervals", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        tabs: [{ id: 1, url: "https://example.com/doc.pdf", title: "Doc", active: true }],
        pageText: "[Pàgina 1]\n" + "text ".repeat(80),
        modelReply: "Idea.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.match(h.calls.fetches[0].body, /no el número imprès/);
        assert.match(h.calls.fetches[0].body, /mai intervals/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Format i llargada del resum (Fase E): preferències de la configuració de Resum
// ---------------------------------------------------------------------------
test("estil del resum - format i llargada triats s'afegeixen al prompt del Resum", async () => {
    const h = await loadSidebar({
        sync: { summaryFormat: "bullets", summaryLength: "short" },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const body = h.calls.fetches[0].body;
        assert.match(body, /Instrucció addicional de format: presenta el resum com una llista/);
        assert.match(body, /Instrucció addicional de llargada: fes-lo molt breu/);
    } finally { h.close(); }
});

test("estil del resum - per defecte no s'afegeix res al prompt", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.doesNotMatch(h.calls.fetches[0].body, /Instrucció addicional de (format|llargada):/);
    } finally { h.close(); }
});

test("estil del resum - no afecta Aprofundir", async () => {
    const h = await loadSidebar({
        sync: { summaryFormat: "tldr", summaryLength: "short", enableDeepdive: true },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "L'anàlisi.",
    });
    try {
        h.document.getElementById("deepDiveBtn").click();
        await h.flush(30);
        assert.doesNotMatch(h.calls.fetches[0].body, /molt breu|TL;DR/i);
    } finally { h.close(); }
});

test("Anki - exportar diu «Enviat a Obsidian» (només s'ha obert l'URL, no se sap si ha funcionat)", async () => {
    const h = await loadSidebar({
        sync: { enableAnki: true, ankiVault: "Notes" },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: '[{"q":"Què és X?","a":"Una cosa."},{"q":"Per què Y?","a":"Perquè sí."}]',
    });
    try {
        h.document.getElementById("ankiBtn").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("ankiExportBtn"), "el panell Anki té el botó d'exportar");
        h.document.querySelector(".anki-select-all").click();
        await h.flush(5);
        const btn = h.document.getElementById("ankiExportBtn");
        assert.match(btn.textContent, /\(2\)/);
        btn.click();
        await h.flush(10);
        const after = h.document.getElementById("ankiExportBtn");     // el panell es recrea en enviar
        assert.match(after.textContent, /Enviat a Obsidian/);
        assert.doesNotMatch(after.textContent, /Afegit/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// 0.14: quan es veu la versió desada, el botó del tipus avisa que torna a generar
// ---------------------------------------------------------------------------
test("regenerar - amb la còpia desada a la vista, el botó diu que regenera; en generar-ne una de nova torna el títol", async () => {
    const url = "https://example.com/article";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...seedTypes(url, ["summary"]) },
        pageText: "Un article. ".repeat(30),
        modelReply: "Resum nou.",
    });
    try {
        const btn = h.document.getElementById("summarizeBtn");
        assert.equal(btn.title, "Resumir");
        btn.click();                       // 1r clic: mostra la còpia desada
        await h.flush(30);
        assert.match(h.document.getElementById("content").textContent, /Text de summary/);
        assert.match(btn.title, /Regenerar/);
        assert.match(btn.getAttribute("aria-label"), /Regenerar/);
        btn.click();                       // 2n clic: regenera (crida al model)
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 1);
        assert.equal(btn.title, "Resumir", "amb el resum nou, torna el títol original");
    } finally { h.close(); }
});

test("memòria cau - el primer clic reutilitza el resum desat (el preload de la pàgina no ho impedeix)", async () => {
    const url = "https://example.com/article";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...seedTypes(url, ["summary"]) },
        pageText: "Un article. ".repeat(30),
        modelReply: "Resum nou.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 0, "no ha de cridar el model: ja hi ha una còpia desada");
        assert.match(h.document.getElementById("content").textContent, /Text de summary/);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Peu: ↑ enviats abans de ↓ rebuts, «–» inicial i el nom complet del model a l'indicador
// ---------------------------------------------------------------------------
test("peu - ↑ enviats abans de ↓ rebuts, valors inicials «–» i title amb el model", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        await h.flush(30);
        const inEl = h.document.getElementById("tokens-in");
        const outEl = h.document.getElementById("tokens-out");
        assert.ok(inEl.compareDocumentPosition(outEl) & 4, "#tokens-in ha d'anar abans de #tokens-out"); // 4 = FOLLOWING
        assert.equal(h.document.getElementById("tokens-in-count").textContent, "–");
        assert.equal(h.document.getElementById("tokens-out-count").textContent, "–");
        const sel = h.document.getElementById("model-select");
        assert.ok(sel.title && sel.title.length > 3, "el selector porta el nom complet del model a title");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// 0.6: sense clau d'API, els generadors es veuen no disponibles (amb motiu) i
// el clic porta al camp de la clau
// ---------------------------------------------------------------------------
test("sense clau - generadors amb aria-disabled i motiu; el clic enfoca el camp de la clau", async () => {
    const h = await loadSidebar({ sync: { enableDeepdive: true }, local: {} });
    try {
        await h.flush(40);
        const ids = ["summarizeBtn", "deepDiveBtn", "conceptMapBtn", "explainSimpleBtn", "scienceBtn", "ankiBtn", "selectPdfBtn"];
        for (const id of ids) {
            const b = h.document.getElementById(id);
            assert.equal(b.getAttribute("aria-disabled"), "true", `${id} aria-disabled`);
            assert.match(b.title, /clau d'API/, `${id} explica el motiu`);
        }
        h.document.getElementById("summarizeBtn").click();
        await h.flush(10);
        assert.equal(h.calls.fetches.length, 0);
        assert.equal(h.document.activeElement.id, "apiKeyInput");
    } finally { h.close(); }
});

test("amb clau - els generadors no porten aria-disabled", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        await h.flush(40);
        assert.equal(h.document.getElementById("summarizeBtn").getAttribute("aria-disabled"), null);
        assert.equal(h.document.getElementById("summarizeBtn").title, "Resumir");
    } finally { h.close(); }
});

test("error 400 - missatge en català amb un «Detalls» plegable amb el text original", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        fetchHandler: async () => ({
            ok: false, status: 400, statusText: "Bad Request",
            headers: { get: () => "application/json" },
            json: async () => ({ error: { message: "Request contains an invalid argument." } }),
        }),
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(40);
        const err = h.document.getElementById("error");
        assert.match(err.textContent, /no ha pogut processar/i);
        const details = err.querySelector("details");
        assert.ok(details, "ha de portar un <details>");
        assert.match(details.textContent, /invalid argument/);
    } finally { h.close(); }
});

test("errors - el codi intern va al final i atenuat, no al començament", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        fetchHandler: async () => ({
            ok: false, status: 418, statusText: "Teapot",
            headers: { get: () => "application/json" },
            json: async () => ({ error: { message: "Sóc una tetera" } }),
        }),
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(40);
        const err = h.document.getElementById("error");
        assert.doesNotMatch(err.textContent.trim(), /^\[\d+\]/, "no ha de començar per [007]");
        assert.match(err.textContent, /Sóc una tetera/);
        const code = err.querySelector(".error-code");
        assert.ok(code, "el codi surt en un span atenuat");
        assert.match(code.textContent, /codi 007/);
    } finally { h.close(); }
});

test("Copiar - activat per defecte (undefined) i s'amaga només si l'usuari l'ha desactivat", async () => {
    const h1 = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        await h1.flush(30);
        assert.notEqual(h1.document.getElementById("copyBtn").style.display, "none");
    } finally { h1.close(); }
    const h2 = await loadSidebar({ sync: { enableMarkdown: false }, local: { apiKey: "AIza_test" } });
    try {
        await h2.flush(30);
        assert.equal(h2.document.getElementById("copyBtn").style.display, "none");
    } finally { h2.close(); }
});

// Focus del panell de text enviat: entra a l'encapçalament i torna al botó que l'obre
test("text enviat - el focus entra al panell i, en tancar-lo, torna al botó del peu", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        h.document.getElementById("sourceTextBtn").click();
        await h.flush(5);
        assert.equal(h.document.activeElement.id, "source-heading", "el focus entra a l'encapçalament del panell");
        h.document.querySelector("#source-panel .history-back-btn").click();
        await h.flush(5);
        assert.equal(h.document.activeElement.id, "sourceTextBtn");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Cites clicables: la cita de «Cites» i la final de cada punt clau és un enllaç que,
// en clicar-lo, la ressalta a la pàgina (sense insígnies de verificació)
// ---------------------------------------------------------------------------
test("cites clicables - tolera variants del títol («Cites literals») i cometes tipogràfiques", async () => {
    const real = "La fusió nuclear imita el procés que alimenta les estrelles.";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: `${real} ` + "Més text de la pàgina. ".repeat(20),
        modelReply: `Resum.\n\n### Cites literals\n- “${real}”\n\n### Punts clau (resum)\n- Idea «${real}»`,
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const links = [...h.document.querySelectorAll("#content a.quote-jump")];
        assert.equal(links.length, 2);
        assert.equal(links[0].dataset.quote, real);
    } finally { h.close(); }
});

test("cites clicables - «Cites» i «Punts clau» porten un enllaç per cita, sense insígnies ✓/⚠", async () => {
    const real = "La fusió nuclear imita el procés que alimenta les estrelles.";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: `${real} ` + "Més text de la pàgina. ".repeat(20),
        modelReply: `Resum.\n\n### Punts clau\n- Idea «${real}»\n- Punt sense cita\n\n### Aprenentatges\n- Una «expressió llarga entre cometes» que no s'enllaça\n\n### Cites\n- «${real}»\n- «Aquesta frase no apareix enlloc de la pàgina original.»`,
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const links = [...h.document.querySelectorAll("#content a.quote-jump")];
        assert.equal(links.length, 3, "1 punt clau + 2 cites");
        assert.equal(links[0].dataset.quote, real);
        assert.equal(links[0].textContent, `«${real}»`, "el text visible no canvia");
        assert.equal(h.document.querySelector("#content .quote-ok, #content .quote-warn, #content a.quote-link"), null);
        assert.equal(h.document.querySelectorAll("#content li")[1].querySelector("a.quote-jump"), null, "punt sense cita");
    } finally { h.close(); }
});

test("cites clicables - clicar-ne una la fa ressaltar a la pestanya activa", async () => {
    const real = "La fusió nuclear imita el procés que alimenta les estrelles.";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: `${real} ` + "Més text. ".repeat(30),
        modelReply: `Resum.\n\n### Cites\n- «${real}»`,
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        const injected = [];
        h.window.chrome.scripting.executeScript = async (inj) => { injected.push(inj); return [{ result: { found: true } }]; };
        h.document.querySelector("#content a.quote-jump").click();
        await h.flush(10);
        assert.equal(injected.length, 1);
        assert.equal(injected[0].args.length, 1);
        assert.equal(injected[0].args[0], real);
        assert.equal(injected[0].target.tabId, 1);
        assert.match(String(injected[0].func), /highlightQuoteInPage/);
    } finally { h.close(); }
});

test("cites clicables - si no es troba a la pàgina o el resum és d'una altra pàgina, ho diu", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Text de la pàgina. ".repeat(30),
        modelReply: "Resum.\n\n### Cites\n- «Una frase que potser ja no hi és.»",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        h.window.chrome.scripting.executeScript = async () => [{ result: { found: false } }];
        h.document.querySelector("#content a.quote-jump").click();
        await h.flush(10);
        const notice = h.document.getElementById("model-notice");
        assert.ok(!notice.classList.contains("hidden"));
        assert.match(notice.textContent, /No s'ha trobat aquesta cita/);
        // Resum d'una altra pàgina: no s'injecta res
        let called = 0;
        h.window.chrome.scripting.executeScript = async () => { called++; return [{ result: { found: true } }]; };
        h.window.chrome.tabs.query = async () => [{ id: 1, url: "https://altra.example/x", title: "x", active: true }];
        h.document.querySelector("#content a.quote-jump").click();
        await h.flush(10);
        assert.equal(called, 0);
        assert.match(notice.textContent, /d'una altra pàgina/);
    } finally { h.close(); }
});

test("cites clicables - no s'enllacen en un PDF (el visor és una altra pàgina)", async () => {
    const pdf = "https://example.com/doc.pdf";
    const key = `summary_cache:${pdf}:summary`;
    const local = { summary_cache_index: [key] };
    local[key] = {
        url: pdf, title: "Doc", model: "gemini-2.5-flash", timestamp: new Date().toISOString(), version: "1.0",
        stats: { input: 900, output: 60 }, type: "summary", style: "default|medium",
        summary: "Idea.\n\n### Cites\n- «Una frase literal del document.»",
    };
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...local },
        tabs: [{ id: 1, url: pdf, title: "Doc", active: true }],
        pageText: "Text del document. ".repeat(30),
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.ok(h.document.querySelector("#content li"), "el resum desat es mostra");
        assert.equal(h.document.querySelector("#content a.quote-jump"), null);
    } finally { h.close(); }
});

test("cites clicables - només a la secció «Cites», no a altres cometes del resum", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "L'autor parla de «una expressió llarga entre cometes del resum» al llarg del text.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.document.querySelector("#content a.quote-jump"), null);
    } finally { h.close(); }
});

// Resum i Anki entren al sistema d'avís de «nova versió del prompt» (els personalitzats)
test("avís de prompt nou - Resum personalitzat avisa abans de generar; el × continua", async () => {
    const h = await loadSidebar({
        sync: { systemPrompt: "El meu prompt de resum", promptVersions: { systemPrompt: 0 } },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        await h.flush(30);
        h.document.getElementById("summarizeBtn").click();
        await h.flush(10);
        assert.match(h.document.getElementById("prompt-update-text").textContent, /prompt de resum/);
        assert.equal(h.calls.fetches.length, 0, "no genera fins que l'usuari continua");
        h.document.getElementById("prompt-update-dismiss").click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 1);
    } finally { h.close(); }
});

test("avís de prompt nou - Resum NO personalitzat adopta el default en silenci (sense avís)", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        await h.flush(30);
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 1);
        assert.ok(h.document.getElementById("prompt-update-notification").classList.contains("hidden"));
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Revisió: l'estat de «resultat acabat de generar» no sobreviu al canvi de vista
// ---------------------------------------------------------------------------
test("pestanyes per tipus - canviar de pestanya NO entra en mode historial (la barra continua)", async () => {
    const url = "https://example.com/article";
    const h = await loadSidebar({ local: { apiKey: "AIza_test", ...seedTypes(url, ["summary", "deepdive"]) } });
    try {
        await h.flush(30);
        await sleep(250);
        h.document.querySelector('#type-tabs [data-type="deepdive"]').click();
        await h.flush(30);
        assert.match(h.document.getElementById("content").textContent, /Text de deepdive/);
        assert.ok(!h.document.querySelector(".toolbar").classList.contains("hidden"), "la barra d'eines continua visible");
        assert.ok(h.document.getElementById("history-back-bar").classList.contains("hidden"), "sense «Tornar a l'historial»");
    } finally { h.close(); }
});

test("procedència i refinadors s'amaguen en veure una entrada desada o l'historial", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...seedHistoryEntry() },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum A.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.ok(!h.document.getElementById("provenance").classList.contains("hidden"));

        h.document.getElementById("historyBtn").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("provenance").classList.contains("hidden"), "amb l'historial obert no hi ha procedència");

        h.document.querySelector(".history-item-title").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("provenance").classList.contains("hidden"), "l'entrada B no porta la procedència de l'A");
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Revisió: drecera/menú no alternen la generació; aturar + tornar a generar no es trepitja
// ---------------------------------------------------------------------------
function slowReplyHandler(text, ms) {
    return async (_url, opts) => {
        await sleep(ms);
        if (opts && opts.signal && opts.signal.aborted) throw new DOMException("Aborted", "AbortError");
        const frame = `data: ${JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 } })}\n\n`;
        return {
            ok: true, status: 200, statusText: "OK",
            headers: { get: (hd) => hd.toLowerCase() === "content-type" ? "text/event-stream" : null },
            body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(frame)); c.close(); } }),
        };
    };
}

test("drecera - una segona pulsació durant la generació no l'atura", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        fetchHandler: slowReplyHandler("El resum.", 300),
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await sleep(60);           // la generació és en curs (el model triga 300 ms)
        h.window.chrome.runtime.onMessage._fire({ action: "trigger_summary", data: { type: "page", url: "x" } }, { id: h.window.chrome.runtime.id });
        await sleep(700);
        assert.match(h.document.getElementById("content").textContent, /El resum\./, "la generació ha acabat, no s'ha aturat");
        assert.doesNotMatch(h.document.getElementById("error").textContent, /aturada/i);
    } finally { h.close(); }
});

test("drecera - amb el resum de la pàgina ja a la vista no el torna a generar", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 1);
        h.window.chrome.runtime.onMessage._fire({ action: "trigger_summary", data: { type: "page", url: "x" } }, { id: h.window.chrome.runtime.id });
        await sleep(400);
        assert.equal(h.calls.fetches.length, 1, "no gasta tokens per a la pàgina que ja es veu");
    } finally { h.close(); }
});

test("aturar i tornar a generar - la generació antiga, en acabar tard, no deixa el botó sense poder aturar la nova", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        fetchHandler: slowReplyHandler("Segona.", 600),
    });
    try {
        // La 1a generació queda esperant la pestanya activa (no es pot avortar) i resol tard
        const tab = { id: 1, url: "https://example.com/article", title: "Article", active: true };
        let calls = 0;
        h.window.chrome.tabs.query = async () => { if (calls++ === 0) await sleep(250); return [tab]; };
        const btn = h.document.getElementById("summarizeBtn");
        btn.click(); await sleep(20);        // 1a generació (espera el contingut)
        btn.click(); await sleep(20);        // atura
        btn.click(); await sleep(60);        // 2a generació (en curs, el model triga 600 ms)
        await sleep(350);                    // ara la 1a ja ha resolt tard
        btn.click(); await sleep(150);       // ha d'aturar la 2a, no llançar-ne una de concurrent
        assert.equal(h.calls.fetches.length, 1, "només la 2a ha cridat el model; el 4t clic l'atura");
        await sleep(700);                    // deixa que s'acabi tota l'activitat abans de tancar la finestra
    } finally { h.close(); }
});

test("PDF local - en obrir un segon PDF, el del visor anterior s'esborra de storage.session (no s'acumulen)", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" }, sync: { enablePdf: true }, modelReply: "Resum." });
    try {
        h.window.extractPdfText = async () => ({ title: "Informe", text: "Text. ".repeat(40) });
        await pickPdf(h, "a.pdf", 0);
        await h.flush(20);
        await sleep(5);               // la clau porta Date.now(): que no coincideixin
        await pickPdf(h, "b.pdf", 7);
        await h.flush(20);
        const all = await h.storage.session.get(null);
        const keys = Object.keys(all).filter(k => k.startsWith("pdfViewer:"));
        assert.equal(keys.length, 1, `només ha de quedar el PDF del visor actual: ${keys}`);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Revisió: memòria cau i preferències d'estil, refinats, i post-procés del camí desat
// ---------------------------------------------------------------------------
test("memòria cau - una còpia generada amb un altre estil no es reutilitza", async () => {
    const url = "https://example.com/article";
    const h = await loadSidebar({
        sync: { summaryFormat: "tldr" },
        local: { apiKey: "AIza_test", ...seedTypes(url, ["summary"]) },     // sense estil = «default|medium»
        pageText: "Un article. ".repeat(30),
        modelReply: "TL;DR nou.",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 1, "ha de regenerar amb el format nou");
        assert.match(h.document.getElementById("content").textContent, /TL;DR nou/);
        const saved = (await h.storage.local.get(`summary_cache:${url}:summary`))[`summary_cache:${url}:summary`];
        assert.equal(saved.style, "tldr|medium", "la còpia desada recorda l'estil");
    } finally { h.close(); }
});

test("camí desat - també enllaça [m:ss], mostra la procedència i els refinadors, i enllaça les cites", async () => {
    const yt = "https://www.youtube.com/watch?v=abc123XYZ_0";
    const local = { summary_cache_index: [] };
    const key = `summary_cache:${yt}:summary`;
    local[key] = {
        url: yt, title: "Vídeo", model: "gemini-2.5-flash", timestamp: new Date().toISOString(), version: "1.0",
        stats: { input: 900, output: 60 }, type: "summary", style: "default|medium",
        summary: "Idea [1:05].\n\n### Cites\n- «Frase literal del vídeo que consta.»\n- «Frase que no consta enlloc.»",
    };
    local.summary_cache_index.push(key);
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...local },
        tabs: [{ id: 1, url: yt, title: "Vídeo", active: true }],
        pageText: "[TRANSCRIPT]\n\n[0:00] Hola. Frase literal del vídeo que consta. " + "més ".repeat(40),
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 0);
        assert.ok(h.document.querySelector("#content a[data-yt-time]"), "enllaç de temps");
        assert.ok(!h.document.getElementById("provenance").classList.contains("hidden"), "procedència");
        assert.equal(h.document.querySelector("#content a.quote-jump"), null, "YouTube: cites sense enllaç");
    } finally { h.close(); }
});

test("pàgines de PDF - només s'enllacen en http(s) (un PDF file:// o altres esquemes no genera enllaços morts)", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        tabs: [{ id: 1, url: "file:///Users/x/doc.pdf", title: "Doc", active: true }],
        pageText: "[Pàgina 1]\n" + "text ".repeat(80),
        modelReply: "Idea clau (p. 3).",
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.document.querySelector("#content a[data-pdf-page]"), null);
    } finally { h.close(); }
});

test("peu - amb la còpia desada a la vista diu «De la memòria cau» i els tokens d'aleshores", async () => {
    const url = "https://example.com/article";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test", ...seedTypes(url, ["summary"]) },
        pageText: "Un article. ".repeat(30),
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(h.document.getElementById("generation-timer").textContent, "De la memòria cau");
        assert.equal(h.calls.fetches.length, 0);
    } finally { h.close(); }
});

test("historial - en esborrar una entrada el focus no es perd (va a la següent o a l'encapçalament)", async () => {
    const mk = (url, ts) => {
        const key = `summary_cache:${url}:summary`;
        return [key, { url, title: url, summary: "R", model: "gemini-2.5-flash", timestamp: ts, version: "1.0", stats: { input: 1, output: 1 }, type: "summary" }];
    };
    const [k1, e1] = mk("https://a.example/1", new Date(Date.now() - 1000).toISOString());
    const [k2, e2] = mk("https://b.example/2", new Date().toISOString());
    const h = await loadSidebar({ local: { apiKey: "AIza_test", [k1]: e1, [k2]: e2, summary_cache_index: [k1, k2] } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush(30);
        const del = h.document.querySelector(".history-delete");
        del.focus();                       // com fa l'usuari amb el teclat o en clicar-hi
        del.click();
        await h.flush(30);
        assert.notEqual(h.document.activeElement, h.document.body, "el focus no pot quedar a <body>");
        assert.ok(h.document.getElementById("history-panel").contains(h.document.activeElement), "el focus continua dins l'historial");
    } finally { h.close(); }
});

test("YouTube - si no es pot moure el vídeo (sense permís), s'obre en pestanya nova i s'avisa", async () => {
    const url = "https://www.youtube.com/watch?v=abc123XYZ_0";
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        tabs: [{ id: 1, url, title: "Vídeo", active: true }],
        pageText: "[TRANSCRIPT: ca]\n\n[0:00] " + "hola ".repeat(80),
        modelReply: "Idea [1:05].",
    });
    try {
        h.window.chrome.scripting.executeScript = async () => { throw new Error("Missing host permission for the tab"); };
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        h.document.querySelector("#content a[data-yt-time]").click();
        await h.flush(20);
        assert.equal(h.calls.tabsCreate.length, 1, "obre el vídeo en una pestanya nova: " + JSON.stringify(h.calls.tabsCreate));
        assert.match(h.document.getElementById("model-notice").textContent, /No s'ha pogut moure el vídeo/);
    } finally { h.close(); }
});

test("mapa conceptual - la barra de controls porta «Ajustar a la vista»", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        sync: { enableConceptMap: true },
        pageText: "Un article. ".repeat(30),
        modelReply: "- Tema\n  - A\n  - B",
    });
    try {
        h.document.getElementById("conceptMapBtn").click();
        await h.flush(40);
        const labels = [...h.document.querySelectorAll("#content button")].map(b => b.getAttribute("aria-label"));
        assert.ok(labels.includes("Ajustar a la vista"), `botons: ${labels}`);
    } finally { h.close(); }
});

test("mapa conceptual - el PNG s'exporta amb TOTS els nodes (desplegats) i el mapa torna al seu estat", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        sync: { enableConceptMap: true },
        pageText: "Un article. ".repeat(30),
        modelReply: "- Tema\n  - A\n    - A1\n  - B\n    - B1",
    });
    try {
        h.document.getElementById("conceptMapBtn").click();
        await h.flush(40);
        const count = () => h.document.querySelectorAll("#content svg .markmap-node").length;
        const before = count();
        assert.equal(before, 3, "inicialment només es veuen els dos primers nivells");
        let atExport = null;
        h.window.markmapNative.exportToPNG = async () => { atExport = count(); };
        const btn = [...h.document.querySelectorAll("#content button")].find(b => b.getAttribute("aria-label") === "Descarregar com a PNG");
        btn.click();
        await h.flush(10);
        assert.equal(atExport, 5, "en exportar es veuen tots els nodes");
        assert.equal(count(), 3, "i després el mapa torna a com estava");
    } finally { h.close(); }
});

// Pantalla completa del mapa d'un PDF local / una selecció: missatges llegibles (no la clau interna)
test("pantalla completa - el mapa d'un PDF local demana confirmació amb el nom del fitxer, no «pdf-local:…»", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" } });
    try {
        let asked = null;
        h.window.confirm = (m) => { asked = m; return false; };
        await h.window.openFullPageView("- T\n  - A", "T", "pdf-local:informe anual.pdf:1234:1700000000");
        assert.ok(asked, "ha de demanar confirmació (el contingut s'insereix en una altra pàgina)");
        assert.match(asked, /informe anual\.pdf/);
        assert.doesNotMatch(asked, /pdf-local:/);
    } finally { h.close(); }
});

test("pantalla completa - amb una pestanya interna del navegador, diu què cal fer per a un PDF local", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        tabs: [{ id: 1, url: "about:blank", title: "Nova pestanya", active: true }],
    });
    try {
        await h.window.openFullPageView("- T\n  - A", "T", "pdf-local:informe.pdf:1:2");
        const msg = h.document.getElementById("error").textContent;
        assert.match(msg, /PDF/, "el consell esmenta el PDF");
        assert.match(msg, /http|web/i);
        assert.doesNotMatch(msg, /pdf-local:/);
    } finally { h.close(); }
});

test("memòria cau - veure una còpia desada NO canvia el model del selector (la propera petició usa el desat)", async () => {
    const url = "https://example.com/article";
    const seeded = seedTypes(url, ["summary"]);
    seeded[`summary_cache:${url}:summary`].model = "gemini-2.5-pro";
    const h = await loadSidebar({
        sync: { modelName: "gemini-2.5-flash" },
        local: { apiKey: "AIza_test", ...seeded },
        pageText: "Un article. ".repeat(30),
    });
    try {
        await h.flush(30);
        const sel = h.document.getElementById("model-select");
        const before = sel.value;
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.equal(sel.value, before, "el selector no ha de mostrar un model que no s'usarà");
        assert.match(h.document.getElementById("provenance").textContent, /2\.5 Pro|gemini-2\.5-pro/i, "el model de la còpia consta a la línia de procedència");
    } finally { h.close(); }
});

test("avís de prompt nou - el botó «Continuar amb el meu prompt» continua l'acció (no només el ×)", async () => {
    const h = await loadSidebar({
        sync: { systemPrompt: "El meu prompt de resum", promptVersions: { systemPrompt: 0 } },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        await h.flush(30);
        h.document.getElementById("summarizeBtn").click();
        await h.flush(10);
        assert.equal(h.calls.fetches.length, 0);
        const btn = h.document.getElementById("prompt-update-continue");
        assert.match(btn.textContent, /Continuar/);
        btn.click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 1);
        assert.ok(h.document.getElementById("prompt-update-notification").classList.contains("hidden"));
    } finally { h.close(); }
});

test("historial - no es pot obrir mentre es genera (amagaria el botó d'aturar) i es recupera en acabar", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        fetchHandler: slowReplyHandler("El resum.", 200),
    });
    try {
        const hist = h.document.getElementById("historyBtn");
        const originalTitle = hist.title;
        h.document.getElementById("summarizeBtn").click();
        await sleep(60);
        assert.equal(hist.disabled, true);
        await sleep(500);
        assert.equal(hist.disabled, false);
        assert.equal(hist.title, originalTitle);
    } finally { h.close(); }
});

test("Copiar - amb targetes d'Anki a la vista copia les targetes llegibles, no el JSON cru", async () => {
    const h = await loadSidebar({
        sync: { enableAnki: true, enableMarkdown: true, markdownTemplate: "{{summary}}" },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: '[{"q":"Què és X?","a":"Una cosa."}]',
    });
    try {
        h.document.getElementById("ankiBtn").click();
        await h.flush(30);
        h.document.getElementById("copyBtn").click();
        await h.flush(10);
        const copied = h.calls.clipboard.at(-1);
        assert.match(copied, /Què és X\?/);
        assert.doesNotMatch(copied, /"q"\s*:/, "no ha de ser el JSON cru");
    } finally { h.close(); }
});

test("PDF - un error d'extracció diu el límit de pàgines i porta el codi al final (taula única d'errors)", async () => {
    const h = await loadSidebar({ local: { apiKey: "AIza_test" }, sync: { enablePdf: true } });
    try {
        h.window.extractPdfText = async () => { throw Object.assign(new Error("massa pàgines"), { code: "TOO_LARGE" }); };
        await pickPdf(h);
        await h.flush(20);
        const err = h.document.getElementById("error");
        assert.match(err.textContent, /500 pàgines/);
        assert.doesNotMatch(err.textContent.trim(), /^\[PDF-/, "el codi no va al començament");
        assert.match(err.querySelector(".error-code").textContent, /codi PDF-013/);
    } finally { h.close(); }
});

test("PDF - amb un PDF http(s) que no es pot descarregar, el botó de triar un PDF local «pulsa» per fer-se descobrible", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        sync: { enablePdf: true },
        tabs: [{ id: 1, url: "http://exemple.local/doc.pdf", title: "Doc", active: true }],
    });
    try {
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.match(h.document.getElementById("error").textContent, /PDF-016|Triar un PDF/);
        assert.ok(h.document.getElementById("selectPdfBtn").classList.contains("pulse"), "el botó ha de destacar");
    } finally { h.close(); }
});

test("Anki des de l'historial - no s'ofereixen «Generar més» ni «Afinar» (fallarien)", async () => {
    const url = "https://example.com/article";
    const key = `summary_cache:${url}:anki`;
    const entry = { url, title: "Article", summary: '<!--anki-->\n[{"q":"Què és X?","a":"Una cosa."}]', model: "gemini-2.5-flash",
        timestamp: new Date().toISOString(), version: "1.0", stats: { input: 1, output: 1 }, type: "anki" };
    const h = await loadSidebar({ local: { apiKey: "AIza_test", [key]: entry, summary_cache_index: [key] } });
    try {
        h.document.getElementById("historyBtn").click();
        await h.flush(30);
        h.document.querySelector(".history-item-title").click();
        await h.flush(30);
        const texts = [...h.document.querySelectorAll("#content button")].map(b => b.textContent.trim());
        assert.ok(texts.some(t => /Afegir a Obsidian/.test(t)), "l'exportació sí que hi és");
        assert.ok(!texts.includes("Generar més"), `botons: ${texts}`);
        assert.equal(h.document.querySelector("#content .anki-afina-input"), null);
    } finally { h.close(); }
});

// ---------------------------------------------------------------------------
// Anki: no duplicar en tornar a exportar; el panell conserva l'estat en re-renderitzar
// ---------------------------------------------------------------------------
async function ankiWithCards(extra = {}) {
    const h = await loadSidebar({
        sync: { enableAnki: true, ankiVault: "Notes", ...extra },
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: '[{"q":"Pregunta A?","a":"Resposta A."},{"q":"Pregunta B?","a":"Resposta B."},{"q":"Pregunta C?","a":"Resposta C."}]',
    });
    h.document.getElementById("ankiBtn").click();
    await h.flush(30);
    return h;
}

test("Anki - tornar a exportar no duplica: les targetes enviades es marquen i no es reenvien", async () => {
    const h = await ankiWithCards();
    try {
        h.document.querySelector(".anki-select-all").click();
        await h.flush(5);
        h.document.getElementById("ankiExportBtn").click();
        await h.flush(10);
        assert.equal(h.calls.tabsCreate.length, 1, "1r enviament");
        assert.equal(h.document.querySelectorAll(".anki-card-sent").length, 3, "les tres queden marcades com a enviades");

        // «Seleccionar-ho tot» no torna a seleccionar les ja enviades → no hi ha res a enviar
        h.document.querySelector(".anki-select-all").click();
        await h.flush(5);
        const exportBtn = h.document.getElementById("ankiExportBtn");
        assert.equal(exportBtn.disabled, true, "el botó queda inactiu: res de nou per enviar");
        exportBtn.click();
        await h.flush(10);
        assert.equal(h.calls.tabsCreate.length, 1, "no s'ha reenviat res");
    } finally { h.close(); }
});

test("Anki - una targeta enviada es pot tornar a enviar si l'usuari la marca a mà", async () => {
    const h = await ankiWithCards();
    try {
        h.document.querySelector(".anki-select-all").click();
        await h.flush(5);
        h.document.getElementById("ankiExportBtn").click();
        await h.flush(10);
        const first = h.document.querySelector(".anki-card .anki-select");
        first.checked = true;
        first.dispatchEvent(new h.window.Event("change", { bubbles: true }));
        assert.match(h.document.getElementById("ankiExportBtn").textContent, /\(1\)/);
        assert.equal(h.document.getElementById("ankiExportBtn").disabled, false);
    } finally { h.close(); }
});

test("Anki - el text d'«Afinar», el mode d'edició i el focus sobreviuen a un re-renderitzat", async () => {
    const h = await ankiWithCards();
    try {
        const input = h.document.querySelector(".anki-afina-input");
        input.value = "dates i xifres";
        input.dispatchEvent(new h.window.Event("input", { bubbles: true }));
        h.document.querySelector(".anki-edit").click();                       // 1a targeta en mode edició
        const selectAll = h.document.querySelector(".anki-select-all");
        selectAll.focus();
        selectAll.click();                                                    // re-renderitza tot el panell
        await h.flush(5);
        assert.equal(h.document.querySelector(".anki-afina-input").value, "dates i xifres", "l'afinat no s'esborra");
        assert.ok(h.document.querySelector(".anki-card textarea.anki-q"), "la targeta continua en mode edició");
        assert.ok(h.document.activeElement.classList.contains("anki-select-all"), "el focus continua al botó premut");
    } finally { h.close(); }
});
