/**
 * tests/ui.test.mjs
 * Tests unitaris per a sidebar/ui.js (funcions de formatació de text)
 * Execució: node --test tests/ui.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

// Configurar DOM global via jsdom
const dom = new JSDOM("<!DOCTYPE html><body></body>");
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;

const require = createRequire(import.meta.url);

// ui.js necessita ext i CURATED_MODELS com a globals del navegador
// (les funcions de formatació no les usen, però el fitxer les referencia)
global.ext = { storage: { sync: { get: async () => ({}), set: async () => {} } } };
const { CURATED_MODELS } = require("../shared/models.js");
global.CURATED_MODELS = CURATED_MODELS;

// getCuratedModelInfo és un global de browser definit a api.js — mock mínim
global.getCuratedModelInfo = () => ({ rpd: 1500 });

const { formatTextToFragment, formatBionicText, setGeneratingState, startGenerationTimer, stopGenerationTimer, applyExtensionOrder, TOOLBAR_GROUPS } = require("../sidebar/ui.js");

// ---------------------------------------------------------------------------
// formatBionicText
// ---------------------------------------------------------------------------

test("formatBionicText - retorna un fragment no buit per a text vàlid", () => {
    const frag = formatBionicText("Hola món");
    assert.ok(frag.childNodes.length > 0, "El fragment ha de tenir fills");
});

test("formatBionicText - paraula de 4 caràcters en negreta els 2 primers (ceil(4*0.45)=2)", () => {
    const frag = formatBionicText("Test");
    const bold = frag.querySelector("b");
    assert.ok(bold, "Ha d'haver-hi un element <b>");
    assert.equal(bold.textContent, "Te", "La fixació biònica ha de cobrir els primers 2 caràcters");
});

test("formatBionicText - text d'un sol caràcter resulta en un <b> amb el caràcter", () => {
    const frag = formatBionicText("A");
    // Primer fill ha de ser un <b>
    const b = Array.from(frag.childNodes).find(n => n.nodeName === "B");
    assert.ok(b, "Ha d'haver-hi un <b>");
    assert.equal(b.textContent, "A");
});

// ---------------------------------------------------------------------------
// formatTextToFragment — Markdown bàsic
// ---------------------------------------------------------------------------

test("formatTextToFragment - text buit retorna fragment buit", () => {
    const frag = formatTextToFragment("");
    assert.equal(frag.childNodes.length, 0);
});

test("formatTextToFragment - paràgraf simple genera un <p>", () => {
    const frag = formatTextToFragment("Hola món");
    const p = frag.querySelector("p");
    assert.ok(p, "Ha de generar un element <p>");
    assert.equal(p.textContent, "Hola món");
});

test("formatTextToFragment - # genera un <h1>", () => {
    const frag = formatTextToFragment("# Títol principal");
    const h1 = frag.querySelector("h1");
    assert.ok(h1, "Ha de generar <h1>");
    assert.equal(h1.textContent, "Títol principal");
});

test("formatTextToFragment - ## genera un <h2>", () => {
    const frag = formatTextToFragment("## Subtítol");
    const h2 = frag.querySelector("h2");
    assert.ok(h2, "Ha de generar <h2>");
});

test("formatTextToFragment - llista amb * genera <ul><li>", () => {
    const frag = formatTextToFragment("* Primer\n* Segon");
    const ul = frag.querySelector("ul");
    assert.ok(ul, "Ha de generar <ul>");
    const items = ul.querySelectorAll("li");
    assert.equal(items.length, 2);
    assert.equal(items[0].textContent, "Primer");
    assert.equal(items[1].textContent, "Segon");
});

test("formatTextToFragment - llista amb - genera <ul><li>", () => {
    const frag = formatTextToFragment("- Element A\n- Element B");
    const ul = frag.querySelector("ul");
    assert.ok(ul, "Ha de generar <ul>");
    assert.equal(ul.querySelectorAll("li").length, 2);
});

test("formatTextToFragment - **text** genera <strong>", () => {
    const frag = formatTextToFragment("Paraula **important** aquí");
    const strong = frag.querySelector("strong");
    assert.ok(strong, "Ha de generar <strong>");
    assert.equal(strong.textContent, "important");
});

test("formatTextToFragment - link Markdown [text](url) genera <a>", () => {
    const frag = formatTextToFragment("[Exemple](https://example.com)");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a>");
    assert.equal(a.href, "https://example.com/");
    assert.equal(a.textContent, "Exemple");
});

test("formatTextToFragment - URL bare genera <a> (domini amb punt)", () => {
    const frag = formatTextToFragment("Visita https://example.com avui");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a> per URL bare");
    assert.equal(a.href, "https://example.com/");
});

test("formatTextToFragment - URL bare no inclou el punt final d'una frase", () => {
    const frag = formatTextToFragment("Llegeix https://example.com.");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a>");
    assert.equal(a.href, "https://example.com/", "El punt final no ha de formar part de la URL");
});

test("formatTextToFragment - DOI amb punts es captura sencer", () => {
    const frag = formatTextToFragment("DOI: 10.1126/science.aei2409");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a> per al DOI");
    assert.equal(a.href, "https://doi.org/10.1126/science.aei2409");
    assert.match(a.textContent, /10\.1126\/science\.aei2409/);
});

test("formatTextToFragment - DOI sense punts també funciona", () => {
    const frag = formatTextToFragment("DOI: 10.1234/simple");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a> per al DOI simple");
    assert.equal(a.href, "https://doi.org/10.1234/simple");
});

test("formatTextToFragment - DOI amb punt final no l'inclou", () => {
    const frag = formatTextToFragment("Referència. DOI: 10.1000/foo.");
    const a = frag.querySelector("a");
    assert.ok(a, "Ha de generar <a>");
    assert.equal(a.href, "https://doi.org/10.1000/foo", "El punt final no ha de formar part del DOI");
});

test("formatTextToFragment - mode biònic actiu afegeix <b> a les paraules", () => {
    const frag = formatTextToFragment("Paraula test", true);
    const boldElements = frag.querySelectorAll("b");
    assert.ok(boldElements.length > 0, "El mode biònic ha de generar elements <b>");
});

// ---------------------------------------------------------------------------
// setGeneratingState — habilitació dels botons d'acció (inclòs ankiBtn)
// ---------------------------------------------------------------------------

const ACTION_BTN_IDS = [
    "summarizeBtn", "deepDiveBtn", "scienceBtn", "copyBtn", "obsidianBtn",
    "conceptMapBtn", "explainSimpleBtn", "selectPdfBtn", "ankiBtn",
];

function setupToolbarDom() {
    document.body.innerHTML =
        `<div id="loading" class="hidden"></div>` +
        ACTION_BTN_IDS.map(id => `<button id="${id}"></button>`).join("");
}

test("setGeneratingState - desactiva tots els botons d'acció mentre genera (inclòs ankiBtn)", () => {
    setupToolbarDom();
    setGeneratingState(true, true, "summarizeBtn");
    for (const id of ACTION_BTN_IDS) {
        if (id === "summarizeBtn") continue; // el botó actiu es manté
        assert.equal(document.getElementById(id).disabled, true,
            `${id} ha d'estar desactivat mentre es genera`);
    }
});

test("setGeneratingState - reactiva ankiBtn en acabar la generació amb un resum a la sidebar", () => {
    setupToolbarDom();
    setGeneratingState(true, true, "summarizeBtn");   // generant
    setGeneratingState(false, true, "summarizeBtn");  // acabat, amb resum (hasContent=true)
    assert.equal(document.getElementById("ankiBtn").disabled, false,
        "ankiBtn s'ha de reactivar quan acaba la generació");
});

// ---------------------------------------------------------------------------
// Regressió (0.7): el botó d'aturar ha de canviar també l'aria-label (preval
// sobre el title) i la icona ha de ser un quadrat, no una «pausa».
// ---------------------------------------------------------------------------
test("setGeneratingState - el botó actiu anuncia «Aturar» (aria-label) i el restaura en acabar", () => {
    setupToolbarDom();
    const btn = document.getElementById("deepDiveBtn");
    btn.setAttribute("aria-label", "Aprofundir");
    btn.title = "Aprofundir";

    setGeneratingState(true, false, "deepDiveBtn");
    assert.equal(btn.getAttribute("aria-label"), "Aturar la generació");
    assert.equal(btn.title, "Aturar la generació");

    setGeneratingState(false, true, "deepDiveBtn");
    assert.equal(btn.getAttribute("aria-label"), "Aprofundir");
    assert.equal(btn.title, "Aprofundir");
});

test("setGeneratingState - la icona d'aturar és un quadrat (un sol <rect>), no una pausa", () => {
    setupToolbarDom();
    setGeneratingState(true, false, "summarizeBtn");
    const rects = document.getElementById("summarizeBtn").querySelectorAll("rect");
    assert.equal(rects.length, 1, "Una pausa en tindria 2");
    setGeneratingState(false, false, "summarizeBtn");
});

// ---------------------------------------------------------------------------
// Regressió (B11): el cronòmetre acabava SEMPRE en verd d'èxit, també després
// d'un error o aturada; i els colors eren fixos (#666/#28a745) en lloc de tokens.
// ---------------------------------------------------------------------------
function setupTimerDom() {
    document.body.innerHTML = `<span id="generation-timer"></span>`;
    return document.getElementById("generation-timer");
}

test("cronòmetre - una generació correcta acaba amb el token d'èxit", () => {
    const el = setupTimerDom();
    startGenerationTimer();
    assert.equal(el.style.color, "var(--text-muted)", "Mentre corre, color atenuat del tema");
    stopGenerationTimer();
    assert.equal(el.style.color, "var(--success)");
});

test("cronòmetre - un error acaba en vermell i un segon stop no el repinta en verd", () => {
    const el = setupTimerDom();
    startGenerationTimer();
    stopGenerationTimer("error");
    assert.equal(el.style.color, "var(--error-text)");
    stopGenerationTimer(); // el que fa setGeneratingState(false) al finally
    assert.equal(el.style.color, "var(--error-text)", "No ha de tornar a verd");
});

test("cronòmetre - sense colors fixos hexadecimals", () => {
    const el = setupTimerDom();
    startGenerationTimer();
    stopGenerationTimer();
    assert.doesNotMatch(el.style.color, /#/);
});

// ---------------------------------------------------------------------------
// Barra d'eines agrupada (2.1): Generar | Exportar | Vista, amb separadors; l'ordre
// de l'usuari es respecta DINS de cada grup. Abans era una fila plana on els
// exportadors es barrejaven amb els generadors segons l'ordre desat.
// ---------------------------------------------------------------------------
const ALL_TOOLBAR_BTNS = ["bionicBtn", "copyBtn", "summarizeBtn", "selectPdfBtn", "ankiBtn", "obsidianBtn", "deepDiveBtn", "scienceBtn", "conceptMapBtn", "explainSimpleBtn"];

function setupGroupedToolbar(hidden = []) {
    document.body.innerHTML = `<div class="toolbar">` +
        ALL_TOOLBAR_BTNS.map(id => `<button id="${id}" style="display:${hidden.includes(id) ? "none" : "flex"}"></button>`).join("") +
        `<button id="settingsBtn"></button></div>`;
    return document.querySelector(".toolbar");
}
const toolbarSequence = (tb) => [...tb.children].map(el => el.classList.contains("toolbar-sep") ? "|" : el.id);

test("barra d'eines - agrupa Generar | Exportar | Vista i respecta l'ordre de l'usuari dins de cada grup", () => {
    const tb = setupGroupedToolbar(["scienceBtn", "conceptMapBtn", "explainSimpleBtn"]);
    // Ordre desat «barrejat»: biònica i copiar abans dels generadors
    applyExtensionOrder(["bionic", "markdown", "resum", "selectpdf", "anki", "obsidian", "deepdive"]);
    assert.deepEqual(toolbarSequence(tb).filter(x => !["scienceBtn", "conceptMapBtn", "explainSimpleBtn"].includes(x)), [
        "summarizeBtn", "selectPdfBtn", "ankiBtn", "deepDiveBtn",   // Generar (ordre de l'usuari)
        "|",
        "copyBtn", "obsidianBtn",                                    // Exportar (ordre de l'usuari)
        "|",
        "bionicBtn",                                                  // Vista
        "settingsBtn",
    ]);
});

test("barra d'eines - els grups buits no deixen separadors orfes i el de configuració és l'últim", () => {
    const tb = setupGroupedToolbar(["copyBtn", "obsidianBtn", "scienceBtn", "conceptMapBtn", "explainSimpleBtn", "deepDiveBtn"]);
    applyExtensionOrder(["resum", "selectpdf", "anki", "bionic"]);
    const seq = toolbarSequence(tb).filter(x => !["copyBtn", "obsidianBtn", "scienceBtn", "conceptMapBtn", "explainSimpleBtn", "deepDiveBtn"].includes(x));
    assert.deepEqual(seq, ["summarizeBtn", "selectPdfBtn", "ankiBtn", "|", "bionicBtn", "settingsBtn"]);
    assert.equal(tb.lastElementChild.id, "settingsBtn");
});

test("barra d'eines - reaplicar l'ordre no duplica separadors", () => {
    const tb = setupGroupedToolbar();
    const order = ["resum", "selectpdf", "simple", "deepdive", "science", "conceptmap", "obsidian", "markdown", "bionic", "anki"];
    applyExtensionOrder(order);
    applyExtensionOrder(order);
    applyExtensionOrder(order);
    assert.equal(tb.querySelectorAll(".toolbar-sep").length, 2);
    for (const sep of tb.querySelectorAll(".toolbar-sep")) {
        assert.equal(sep.getAttribute("aria-hidden"), "true", "Els separadors són decoratius");
    }
});

test("barra d'eines - tots els botons coneguts pertanyen a un grup (cap queda fora)", () => {
    const grouped = TOOLBAR_GROUPS.flat().sort();
    assert.deepEqual(grouped, ALL_TOOLBAR_BTNS.slice().sort());
});

// ---------------------------------------------------------------------------
// Renderitzador Markdown (2.3): Gemini fa servir subllistes, llistes numerades,
// cursiva, codi i separadors, i es veien amb els símbols literals (white-space:
// pre-wrap mostrava fins i tot els espais del sagnat).
// ---------------------------------------------------------------------------
test("markdown - subllistes sagnades generen <ul> imbricats (no paràgrafs amb «-» literal)", () => {
    const frag = formatTextToFragment("- Pare\n  - Fill A\n  - Fill B\n    - Nét\n- Altre pare");
    const root = frag.querySelector("ul");
    assert.equal(frag.querySelectorAll("p").length, 0, "Cap paràgraf amb guió literal");
    assert.equal(root.children.length, 2, "Dos items al primer nivell");
    const nested = root.children[0].querySelector("ul");
    assert.ok(nested, "El primer item ha de tenir una subllista");
    assert.equal(nested.children.length, 2);
    assert.ok(nested.children[1].querySelector("ul li"), "El segon fill té un nét");
    assert.equal(root.children[1].querySelector("ul"), null);
});

test("markdown - llista numerada genera <ol> i conserva el número d'inici", () => {
    const frag = formatTextToFragment("1. Primer\n2. Segon\n3. Tercer");
    const ol = frag.querySelector("ol");
    assert.ok(ol);
    assert.equal(ol.children.length, 3);
    const from3 = formatTextToFragment("3. Tres\n4. Quatre").querySelector("ol");
    assert.equal(from3.start, 3);
});

test("markdown - una línia en blanc entre items numerats NO trenca la llista", () => {
    const ol = formatTextToFragment("1. A\n\n2. B\n\n3. C").querySelectorAll("ol");
    assert.equal(ol.length, 1, "Una sola llista (si no, cada item reiniciaria a 1)");
    assert.equal(ol[0].children.length, 3);
});

test("markdown - llista numerada amb subpunts imbrica un <ul> dins de l'<li>", () => {
    const frag = formatTextToFragment("1. Pas\n   - detall\n2. Altre");
    const ol = frag.querySelector("ol");
    assert.equal(ol.children.length, 2);
    assert.ok(ol.children[0].querySelector("ul li"));
});

test("markdown - un paràgraf després d'una llista la tanca", () => {
    const frag = formatTextToFragment("- A\n- B\n\nText posterior");
    assert.equal(frag.querySelectorAll("ul").length, 1);
    assert.equal(frag.querySelector("p").textContent, "Text posterior");
});

test("markdown - *cursiva* genera <em> i `codi` genera <code>", () => {
    const frag = formatTextToFragment("Això és *important* i `x = 1` també");
    assert.equal(frag.querySelector("em").textContent, "important");
    assert.equal(frag.querySelector("code").textContent, "x = 1");
    assert.ok(!frag.textContent.includes("*"), "Sense asteriscs literals");
    assert.ok(!frag.textContent.includes("`"), "Sense cometes inverses literals");
});

test("markdown - el gras continua funcionant i no es confon amb cursiva", () => {
    const frag = formatTextToFragment("**gras** i *cursiva*");
    assert.equal(frag.querySelector("strong").textContent, "gras");
    assert.equal(frag.querySelector("em").textContent, "cursiva");
});

test("markdown - un asterisc solt o una multiplicació no es converteix en cursiva", () => {
    const frag = formatTextToFragment("2 * 3 = 6 i a*b");
    assert.equal(frag.querySelector("em"), null);
    assert.match(frag.textContent, /2 \* 3 = 6/);
});

test("markdown - --- genera <hr> (i no una llista)", () => {
    const frag = formatTextToFragment("Abans\n\n---\n\nDesprés");
    assert.ok(frag.querySelector("hr"));
    assert.equal(frag.querySelector("ul"), null);
});

test("markdown - bloc de codi ``` genera <pre><code> amb el text literal", () => {
    const frag = formatTextToFragment("Exemple:\n```\n- no és llista\n**ni gras**\n```\nFi");
    const code = frag.querySelector("pre code");
    assert.ok(code);
    assert.equal(code.textContent, "- no és llista\n**ni gras**");
    assert.equal(frag.querySelector("ul"), null);
    assert.equal(frag.querySelector("strong"), null);
});

test("markdown - un bloc de codi sense tancar (resposta tallada) es mostra igualment", () => {
    const frag = formatTextToFragment("```\nlinia 1\nlinia 2");
    assert.equal(frag.querySelector("pre code").textContent, "linia 1\nlinia 2");
});

test("markdown - el contingut no s'interpreta com a HTML (sense injecció)", () => {
    const frag = formatTextToFragment("- <img src=x onerror=alert(1)>\n\n**<b>x</b>**");
    assert.equal(frag.querySelector("img"), null);
    assert.equal(frag.querySelector("b"), null);
    assert.match(frag.textContent, /<img src=x onerror=alert\(1\)>/);
});

test("markdown - amb biònica activa les subllistes i la cursiva també funcionen", () => {
    const frag = formatTextToFragment("- Pare\n  - Fill amb paraules llargues", true);
    assert.ok(frag.querySelector("ul ul li b"), "El text del fill ha de dur negretes biòniques");
});
