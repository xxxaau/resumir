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
        assert.equal(bar.getAttribute("role"), "tablist");
        const tabs = [...bar.querySelectorAll('[role="tab"]')];
        assert.equal(tabs.length, 2);
        assert.ok(tabs.every(t => t.hasAttribute("aria-selected")));

        const deep = tabs.find(t => t.dataset.type === "deepdive");
        deep.click();
        await h.flush(30);
        assert.match(h.document.getElementById("content").textContent, /Text de deepdive/);
        await sleep(250);
        const after = [...bar.querySelectorAll('[role="tab"]')];
        assert.equal(after.find(t => t.dataset.type === "deepdive").getAttribute("aria-selected"), "true");
        assert.equal(after.find(t => t.dataset.type === "summary").getAttribute("aria-selected"), "false");
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
// Refinadors ràpids (Fase E): «Més curt» / «Més detall» sota el resum
// ---------------------------------------------------------------------------
test("refinadors - «Més curt» torna a generar amb la instrucció afegida", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        pageText: "Un article. ".repeat(30),
        modelReply: "El resum.",
    });
    try {
        const box = h.document.getElementById("refiners");
        assert.ok(box.classList.contains("hidden"), "sense resum no hi són");
        h.document.getElementById("summarizeBtn").click();
        await h.flush(30);
        assert.ok(!box.classList.contains("hidden"));
        assert.equal(h.calls.fetches.length, 1);

        h.document.getElementById("refine-shorter").click();
        await h.flush(30);
        assert.equal(h.calls.fetches.length, 2, "ha de regenerar, no reutilitzar la memòria cau");
        assert.match(h.calls.fetches[1].body, /més curt/i);
        assert.doesNotMatch(h.calls.fetches[0].body, /més curt/i);
    } finally { h.close(); }
});

test("refinadors - amagats en un mapa conceptual", async () => {
    const h = await loadSidebar({
        local: { apiKey: "AIza_test" },
        sync: { enableConceptMap: true },
        pageText: "Un article. ".repeat(30),
        modelReply: "# Tema\n## Subtema",
    });
    try {
        h.document.getElementById("conceptMapBtn").click();
        await h.flush(30);
        assert.ok(h.document.getElementById("refiners").classList.contains("hidden"));
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
        assert.match(btn.textContent, /Enviat a Obsidian/);
        assert.doesNotMatch(btn.textContent, /Afegit/);
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
