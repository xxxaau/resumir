/**
 * tests/pdf-viewer.test.mjs
 * Visor PDF propi (sidebar/pdf-viewer.html) dins jsdom amb pdf.js simulat:
 * teclat, títol amb el nom del fitxer i que recarregar no esborri el PDF.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const SIDEBAR = resolve(dirname(fileURLToPath(import.meta.url)), "../sidebar");
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function loadViewer(search = "?key=k1&name=Informe%20anual.pdf") {
    const html = readFileSync(resolve(SIDEBAR, "pdf-viewer.html"), "utf8");
    const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "chrome-extension://test/sidebar/pdf-viewer.html" + search });
    const { window } = dom;
    const calls = { close: 0, removed: [] };
    window.close = () => { calls.close++; };
    window.HTMLCanvasElement.prototype.getContext = () => ({ setTransform() {} });
    const store = { k1: Buffer.from("%PDF-1.4 fake").toString("base64") };
    window.chrome = {
        storage: { session: { get: async (k) => ({ [k]: store[k] }), remove: async (k) => { calls.removed.push(k); delete store[k]; } } },
        runtime: { getURL: (p) => p },
    };
    const page = { getViewport: ({ scale }) => ({ width: 100 * scale, height: 140 * scale, scale }), render: () => ({ promise: Promise.resolve() }), getTextContent: async () => ({}) };
    window.pdfjsLib = {
        GlobalWorkerOptions: {},
        getDocument: () => ({ promise: Promise.resolve({ numPages: 3, getPage: async () => page, destroy() {} }) }),
        renderTextLayer: () => ({ promise: Promise.resolve(), cancel() {} }),
    };
    const ctx = dom.getInternalVMContext();
    for (const f of ["../ext.js", "pdf-zoom.js", "pdf-viewer.js"]) {
        new vm.Script(readFileSync(resolve(SIDEBAR, f), "utf8"), { filename: f }).runInContext(ctx);
    }
    await sleep(60);
    return { window, document: window.document, calls, close: () => window.close.call ? dom.window.close() : null };
}
const key = (w, target, k) => target.dispatchEvent(new w.KeyboardEvent("keydown", { key: k, bubbles: true }));

test("visor PDF - el títol porta el nom del fitxer", async () => {
    const v = await loadViewer();
    assert.equal(v.document.getElementById("doc-title").textContent, "Informe anual.pdf");
    assert.match(v.document.title, /Informe anual\.pdf/);
});

test("visor PDF - Esc NO tanca la pestanya (només ho fa «Tancar»)", async () => {
    const v = await loadViewer();
    key(v.window, v.document, "Escape");
    assert.equal(v.calls.close, 0);
    v.document.getElementById("closeBtn").click();
    assert.equal(v.calls.close, 1);
});

test("visor PDF - les fletxes dins el camp de pàgina no canvien de pàgina", async () => {
    const v = await loadViewer();
    const input = v.document.getElementById("pageInput");
    key(v.window, input, "ArrowRight");
    await sleep(20);
    assert.equal(input.value, "1", "la fletxa al camp mou el cursor, no la pàgina");
    key(v.window, v.document.body, "ArrowRight");
    await sleep(20);
    assert.equal(input.value, "2", "fora del camp sí que passa de pàgina");
});

test("visor PDF - recarregar no esborra el PDF de la sessió (sí en tancar amb el botó)", async () => {
    const v = await loadViewer();
    v.window.dispatchEvent(new v.window.Event("beforeunload"));
    assert.deepEqual(v.calls.removed, [], "un reload necessita el PDF encara");
    v.document.getElementById("closeBtn").click();
    assert.deepEqual(v.calls.removed, ["k1"]);
});

test("visor PDF - botons de pàgina amb ‹ › (no emoji de reproductor)", async () => {
    const v = await loadViewer();
    assert.equal(v.document.getElementById("prevBtn").textContent.trim(), "‹");
    assert.equal(v.document.getElementById("nextBtn").textContent.trim(), "›");
});

test("visor PDF - els controls tenen :focus-visible (navegació amb teclat)", async () => {
    const { readFileSync } = await import("node:fs");
    const html = readFileSync(resolve(SIDEBAR, "pdf-viewer.html"), "utf8");
    assert.match(html, /\.close-btn:focus-visible/);
    assert.match(html, /#footer button:focus-visible/);
    assert.match(html, /page-input:focus-visible/);
});
