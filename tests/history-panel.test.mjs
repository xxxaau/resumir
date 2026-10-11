/**
 * tests/history-panel.test.mjs
 * Tests unitaris per a sidebar/history.js
 * Execució: node --test tests/history-panel.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createStorageMock } from "./helpers/storage-mock.mjs";

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// DOM mock
// ---------------------------------------------------------------------------

function makeEl(id = "") {
    const el = {
        id,
        tagName: "DIV",
        textContent: "",
        href: "",
        className: "",
        style: { setProperty() {}, removeProperty() {} },
        dataset: {},
        classList: {
            _c: new Set(),
            add(...c)          { c.forEach(x => this._c.add(x)); },
            remove(...c)       { c.forEach(x => this._c.delete(x)); },
            contains(c)        { return this._c.has(c); },
            toggle(c, force)   {
                if (force === true)  { this._c.add(c);    return true; }
                if (force === false) { this._c.delete(c); return false; }
                if (this._c.has(c)) { this._c.delete(c); return false; }
                this._c.add(c); return true;
            },
        },
        _attrs: {},
        setAttribute(k, v)        { this._attrs[k] = String(v); },
        getAttribute(k)           { return this._attrs[k] ?? null; },
        removeAttribute(k)        { delete this._attrs[k]; if (k === "href") this.href = null; },
        _children: [],
        replaceChildren(...nodes) { this._children = [...nodes]; },
        appendChild(n)            { this._children.push(n); return n; },
        insertBefore(n, ref)      {
            const i = this._children.indexOf(ref);
            if (i >= 0) this._children.splice(i, 0, n);
            else this._children.push(n);
            return n;
        },
        addEventListener() {},
        querySelector(sel) {
            // Cerca superficial als fills
            return this._children.find(c => {
                if (sel.startsWith(".")) return c.className?.includes(sel.slice(1));
                if (sel.startsWith("#")) return c.id === sel.slice(1);
                return false;
            }) || null;
        },
        get nextSibling() { return null; },
    };
    return el;
}

// Construeix un DOM complet per als tests
function buildDOM() {
    const els = {};
    const ids = [
        "history-panel", "content", "loading", "error",
        "history-back-bar", "page-title-strip", "container",
        "source-panel", "page-title-link",
    ];
    for (const id of ids) els[id] = makeEl(id);

    const toolbar = makeEl("toolbar");
    toolbar.className = "toolbar";

    return {
        els,
        toolbar,
        getElementById(id)    { return els[id] || null; },
        querySelector(sel)    {
            if (sel === ".toolbar") return toolbar;
            return null;
        },
        createElement(tag)    {
            const el = makeEl();
            el.tagName = tag.toUpperCase();
            return el;
        },
    };
}

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

const storageMock = createStorageMock();

function setupGlobals(dom) {
    global.document = dom;
    global.ext = {
        storage: {
            local: storageMock,
            sync:  storageMock,
        },
    };
    global.CONTENT_TYPES = [
        { id: "summary",    icon: "\u{1F4DD}", label: "Resum",            order: 1 },
        { id: "deepdive",   icon: "\u{1F52C}", label: "Aprofundiment",    order: 2 },
        { id: "conceptmap", icon: "\u{1F9E0}", label: "Mapa conceptual",  order: 3 },
        { id: "science",    icon: "\u{1F4CA}", label: "Validaci\u00F3",   order: 4 },
    ];
    global.listCachedSummaries = async () => [];
    global.getSummaryCache = async () => null;
    global.getSourceHttpUrl = require("../sidebar/utils.js").getSourceHttpUrl;
    global.DEFAULT_BIONIC = { fixation: 20, font: "system-ui, sans-serif", weight: "600", fontSize: "1.2em", lineHeight: "1.5" };
    global.applyBionicStyles = () => {}; // definit a summary.js; mock com la resta de globals
    global.formatTextToFragment = (text) => {
        const el = makeEl();
        el.textContent = text;
        return el;
    };
    // Definits a sidebar/anki.js; mocks per als tests de loadHistoryEntry.
    global.parseAnkiCards = (rawText) => {
        const start = rawText.indexOf("[");
        const end = rawText.lastIndexOf("]");
        if (start === -1 || end === -1) return [];
        try { return JSON.parse(rawText.slice(start, end + 1)); } catch { return []; }
    };
    global.setAnkiCards = () => {};
    global.renderAnkiPanel = () => {};
}

// Carreguem el mòdul un cop
let dom = buildDOM();
setupGlobals(dom);

const {
    openHistoryPanel,
    closeHistoryPanel,
    loadHistoryEntry,
    openSourcePanel,
    closeSourcePanel,
} = require("../sidebar/history.js");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function resetDOM() {
    dom = buildDOM();
    global.document = dom;
    storageMock._clear();
}

// ---------------------------------------------------------------------------
// openHistoryPanel
// ---------------------------------------------------------------------------

test("openHistoryPanel - amaga content/loading/error i mostra el panel", async () => {
    resetDOM();
    // Partim amb content visible
    dom.els.content.classList.remove("hidden");

    global.listCachedSummaries = async () => [];
    await openHistoryPanel();

    assert.ok(dom.els.content.classList.contains("hidden"),        "content ha de ser hidden");
    assert.ok(dom.els.loading.classList.contains("hidden"),        "loading ha de ser hidden");
    assert.ok(dom.els.error.classList.contains("hidden"),          "error ha de ser hidden");
    assert.ok(!dom.els["history-panel"].classList.contains("hidden"), "history-panel ha de ser visible");
});

test("openHistoryPanel - amaga toolbar i page-title-strip", async () => {
    resetDOM();
    global.listCachedSummaries = async () => [];
    await openHistoryPanel();

    assert.ok(dom.toolbar.classList.contains("hidden"),               "toolbar ha de ser hidden");
    assert.ok(dom.els["page-title-strip"].classList.contains("hidden"), "page-title-strip ha de ser hidden");
});

test("openHistoryPanel - renderitza missatge buit si no hi ha entrades", async () => {
    resetDOM();
    global.listCachedSummaries = async () => [];
    await openHistoryPanel();

    const panel = dom.els["history-panel"];
    const host = panel._children.find(c => c.className === "history-list-host");
    const hasEmpty = host?._children.some(c => c.textContent?.includes("Aquí apareixeran els resums"));
    assert.ok(hasEmpty, "Ha de mostrar el missatge d'estat buit amb la retenció");
});

test("openHistoryPanel - renderitza les entrades de l'historial", async () => {
    resetDOM();
    const now = new Date().toISOString();
    global.listCachedSummaries = async () => [
        { title: "Article A", url: "https://a.com", summary: "S1", model: "gemini-2.0-flash", timestamp: now },
        { title: "Article B", url: "https://b.com", summary: "S2", model: "gemini-2.5-flash", timestamp: now },
    ];
    await openHistoryPanel();

    const panel = dom.els["history-panel"];
    // La llista viu dins del contenidor (la cerca la re-renderitza)
    const host = panel._children.find(c => c.className === "history-list-host");
    const list = host?._children.find(c => c.className === "history-list");
    assert.ok(list, "Ha d'existir una history-list");
    assert.equal(list._children.length, 2, "Ha de tenir 2 ítems");
    const titles = list._children.map(li => {
        const topRow = li._children.find(c => c.className === "history-item-top");
        return topRow?._children.find(c => c.className === "history-item-title")?.textContent;
    });
    assert.ok(titles.includes("Article A"), "Ha de mostrar 'Article A'");
    assert.ok(titles.includes("Article B"), "Ha de mostrar 'Article B'");
});

test("openHistoryPanel - trunca títols llargs a 120 caràcters", async () => {
    resetDOM();
    const longTitle = "T".repeat(130);
    global.listCachedSummaries = async () => [
        { title: longTitle, url: "https://x.com", summary: "S", model: "m", timestamp: new Date().toISOString() },
    ];
    await openHistoryPanel();

    const panel = dom.els["history-panel"];
    const host  = panel._children.find(c => c.className === "history-list-host");
    const list  = host._children.find(c => c.className === "history-list");
    const topRow = list._children[0]._children.find(c => c.className === "history-item-top");
    const titleEl = topRow?._children.find(c => c.className === "history-item-title");
    assert.ok(titleEl.textContent.length <= 122, // 120 + "…"
        `Títol truncat ha de tenir ≤122 chars, té ${titleEl.textContent.length}`);
    assert.ok(titleEl.textContent.endsWith("…"), "Ha d'acabar amb '…'");
});

// ---------------------------------------------------------------------------
// closeHistoryPanel
// ---------------------------------------------------------------------------

test("closeHistoryPanel - amaga el panel i restaura l'element previ", async () => {
    resetDOM();
    // Obrim primer perquè _previousVisible es guardi
    dom.els.content.classList.remove("hidden");
    global.listCachedSummaries = async () => [];
    await openHistoryPanel();

    // Ara tanquem
    closeHistoryPanel();

    assert.ok(dom.els["history-panel"].classList.contains("hidden"), "history-panel ha de ser hidden");
    assert.ok(!dom.els.content.classList.contains("hidden"),          "content ha de ser restaurat");
    assert.ok(!dom.toolbar.classList.contains("hidden"),              "toolbar ha de ser restaurada");
});

// ---------------------------------------------------------------------------
// loadHistoryEntry
// ---------------------------------------------------------------------------

test("loadHistoryEntry - carrega el resum a content i amaga el panel", async () => {
    resetDOM();
    await storageMock.set({ isBionicActive: false });

    const entry = {
        title:   "Article de Prova",
        url:     "https://example.com",
        summary: "Contingut del resum",
        model:   "gemini-2.0-flash",
        timestamp: new Date().toISOString(),
    };

    await loadHistoryEntry(entry);

    assert.ok(!dom.els.content.classList.contains("hidden"), "content ha de ser visible");
    assert.ok(dom.els["history-panel"].classList.contains("hidden"), "history-panel ha de ser hidden");
    assert.ok(!dom.els["history-back-bar"].classList.contains("hidden"), "back-bar ha de ser visible");
});

test("loadHistoryEntry - mostra el títol de l'entrada al page-title-link", async () => {
    resetDOM();
    await storageMock.set({ isBionicActive: false });

    const entry = {
        title:   "Títol de l'article",
        url:     "https://example.com/article",
        summary: "Resum",
        model:   "m",
        timestamp: new Date().toISOString(),
    };

    await loadHistoryEntry(entry);

    const titleLink = dom.els["page-title-link"];
    assert.equal(titleLink.textContent, "Títol de l'article");
    assert.equal(titleLink.href, "https://example.com/article");
});

test("loadHistoryEntry - entrada antiga «seleccio:» enllaça a l'URL real (sense el prefix intern)", async () => {
    resetDOM();
    await storageMock.set({ isBionicActive: false });

    await loadHistoryEntry({
        title:   "Selecció",
        url:     "seleccio:https://example.com",
        summary: "Text",
        model:   "m",
        timestamp: new Date().toISOString(),
    });

    assert.equal(dom.els["page-title-link"].href, "https://example.com");
});

test("loadHistoryEntry - PDF local: el títol queda sense href (no un href='#' que obria la sidebar)", async () => {
    resetDOM();
    await storageMock.set({ isBionicActive: false });

    await loadHistoryEntry({
        title:   "Informe",
        url:     "pdf-local:informe.pdf",
        summary: "Text",
        model:   "m",
        timestamp: new Date().toISOString(),
    });

    assert.equal(dom.els["page-title-link"].href, null,
        "Sense URL http(s) s'ha de treure l'href");
});

// ---------------------------------------------------------------------------
// loadHistoryEntry - Anki (regressió: abans es renderitzava el JSON cru com
// a text pla perquè no hi havia branca "anki", només "conceptmap")
// ---------------------------------------------------------------------------

test("loadHistoryEntry - una entrada Anki restaura el panell interactiu, no text pla", async () => {
    resetDOM();
    await storageMock.set({ isBionicActive: false });

    let capturedCards = null;
    let capturedCtx = null;
    global.setAnkiCards = (cards) => { capturedCards = cards; };
    global.renderAnkiPanel = (ctx) => { capturedCtx = ctx; };

    const entry = {
        title: "Targetes de prova",
        url: "https://example.com/article",
        summary: '<!--anki-->\n[{"q":"Pregunta 1","a":"Resposta 1"}]',
        model: "gemini-2.0-flash",
        timestamp: new Date().toISOString(),
    };

    await loadHistoryEntry(entry);

    assert.ok(Array.isArray(capturedCards), "setAnkiCards s'ha de cridar amb les targetes parsejades");
    assert.equal(capturedCards.length, 1);
    assert.equal(capturedCards[0].q, "Pregunta 1");
    assert.ok(capturedCtx, "renderAnkiPanel s'ha de cridar (no formatTextToFragment)");
    assert.equal(capturedCtx.contentDiv, dom.els.content);

    // El text cru del marcador NO ha d'acabar mostrat literalment a content.
    assert.ok(!dom.els.content.textContent?.includes("<!--anki-->"),
        "El marcador cru no s'ha de renderitzar com a text pla");
});

test("loadHistoryEntry - Anki des de l'Historial: 'Genera més' avisa que no està disponible en lloc de petar", async () => {
    resetDOM();
    await storageMock.set({ isBionicActive: false });

    let capturedCtx = null;
    global.renderAnkiPanel = (ctx) => { capturedCtx = ctx; };

    await loadHistoryEntry({
        title: "Targetes",
        url: "https://example.com",
        summary: '<!--anki-->\n[{"q":"P","a":"R"}]',
        model: "m",
        timestamp: new Date().toISOString(),
    });

    assert.equal(typeof capturedCtx.onGenerateMore, "function");
    capturedCtx.onGenerateMore("");

    assert.ok(!dom.els.error.classList.contains("hidden"), "error ha de ser visible");
    assert.ok(dom.els.error.textContent.includes("Historial"),
        `error ha d'explicar la limitació, té: "${dom.els.error.textContent}"`);
});

// ---------------------------------------------------------------------------
// openSourcePanel / closeSourcePanel
// ---------------------------------------------------------------------------

test("openSourcePanel - mostra el panell amb el text i amaga content", async () => {
    resetDOM();
    dom.els.content.classList.remove("hidden");

    openSourcePanel("Text de prova per mostrar");

    assert.ok(!dom.els["source-panel"].classList.contains("hidden"), "source-panel ha de ser visible");
    assert.ok(dom.els.content.classList.contains("hidden"),          "content ha de ser hidden");
    assert.ok(dom.toolbar.classList.contains("hidden"),              "toolbar ha de ser hidden");

    const pre = dom.els["source-panel"]._children
        .find(c => c.tagName === "PRE");
    assert.ok(pre, "Ha d'haver un element <pre>");
    assert.equal(pre.textContent, "Text de prova per mostrar");
});

test("closeSourcePanel - tanca el panell i restaura l'element previ", async () => {
    resetDOM();
    dom.els.content.classList.remove("hidden");

    openSourcePanel("Text");
    closeSourcePanel();

    assert.ok(dom.els["source-panel"].classList.contains("hidden"), "source-panel ha de ser hidden");
    assert.ok(!dom.els.content.classList.contains("hidden"),         "content ha de ser restaurat");
});
