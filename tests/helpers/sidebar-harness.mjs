/**
 * tests/helpers/sidebar-harness.mjs
 * Carrega la barra lateral REAL (sidebar.html + els seus scripts, en l'ordre
 * del HTML) dins de jsdom amb una API d'extensió simulada, perquè es puguin
 * escriure tests d'integració del comportament de sidebar.js (botons, listeners
 * d'storage, etc.), que no es pot importar com un mòdul normal.
 *
 * Ús:
 *   const h = await loadSidebar({ sync: {...}, local: {...}, tabs: [...] });
 *   h.document.getElementById("bionicBtn").click();
 *   await h.flush();
 *   h.close();
 */
import { JSDOM } from "jsdom";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createStorageMock } from "./storage-mock.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const SIDEBAR_DIR = resolve(ROOT, "sidebar");

// Scripts que no es carreguen: llibreries grans que el harness substitueix per stubs.
const STUBBED = new Set(["../vendor/pdf.min.js", "../Readability.js"]);

export function makeEvent() {
    const listeners = [];
    return {
        addListener: (fn) => listeners.push(fn),
        removeListener: (fn) => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); },
        hasListener: (fn) => listeners.includes(fn),
        _fire: (...args) => listeners.forEach(fn => fn(...args)),
    };
}

/**
 * Emula la propagació d'`storage.onChanged` com fa el navegador: cada `set`
 * dispara el listener amb { clau: { oldValue, newValue } }.
 */
export function makeStorageArea(area, onChanged, initial) {
    const base = createStorageMock();
    base._set(initial || {});
    return {
        ...base,
        async set(obj) {
            const changes = {};
            const before = await base.get(Object.keys(obj));
            for (const k of Object.keys(obj)) changes[k] = { oldValue: before[k], newValue: obj[k] };
            await base.set(obj);
            onChanged._fire(changes, area);
        },
    };
}

/**
 * Opcions:
 *   sync / local   → contingut inicial de storage
 *   tabs           → resultat de tabs.query
 *   pageText       → si es dona, getPageContent() retorna aquesta pàgina (evita
 *                    la injecció de scripts real)
 *   modelReply     → si es dona, fetch() respon amb un stream SSE de Gemini amb
 *                    aquest text (un sol chunk), i s'hi registra a calls.fetches
 */
export async function loadSidebar({
    sync = {}, local = {},
    tabs = [{ id: 1, url: "https://example.com/article", title: "Article", active: true }],
    pageText = null, modelReply = null,
} = {}) {
    const html = readFileSync(resolve(SIDEBAR_DIR, "sidebar.html"), "utf8");
    const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "chrome-extension://test/sidebar/sidebar.html" });
    const { window } = dom;

    const onChanged = makeEvent();
    const calls = { openOptionsPage: 0, tabsCreate: [], clipboard: [], fetches: [] };

    window.chrome = {
        storage: {
            sync: makeStorageArea("sync", onChanged, sync),
            local: makeStorageArea("local", onChanged, local),
            session: createStorageMock(),
            onChanged,
        },
        runtime: {
            openOptionsPage: () => { calls.openOptionsPage++; },
            getURL: (p) => `chrome-extension://test/${p}`,
            onMessage: makeEvent(),
            sendMessage: async () => ({}),
        },
        tabs: {
            query: async () => tabs,
            create: async (opts) => { calls.tabsCreate.push(opts); return { id: 99 }; },
            remove: async () => {},
            sendMessage: async () => ({}),
            onActivated: makeEvent(),
            onUpdated: makeEvent(),
        },
        scripting: { executeScript: async () => [] },
        permissions: { contains: async () => true, request: async () => true },
        windows: { getCurrent: async () => ({ id: 1 }) },
    };
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, addEventListener() {} }));
    Object.defineProperty(window.navigator, "clipboard", { value: { writeText: async (t) => { calls.clipboard.push(t); } }, configurable: true });
    window.TextDecoder = TextDecoder;
    window.TextEncoder = TextEncoder;
    window.ReadableStream = ReadableStream;
    if (modelReply !== null) {
        window.fetch = async (url, opts) => {
            calls.fetches.push({ url, body: opts && opts.body });
            const frame = `data: ${JSON.stringify({
                candidates: [{ content: { parts: [{ text: modelReply }] } }],
                usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 5 },
            })}\n\n`;
            return {
                ok: true, status: 200, statusText: "OK",
                headers: { get: (h) => h.toLowerCase() === "content-type" ? "text/event-stream" : null },
                body: new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(frame)); c.close(); } }),
            };
        };
    }
    // Stubs de les llibreries grans
    window.eval("var pdfjsLib = { GlobalWorkerOptions: {} }; var Readability = function () { this.parse = () => null; };");

    const ctx = dom.getInternalVMContext();
    const scriptSrcs = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
    for (const src of scriptSrcs) {
        if (STUBBED.has(src)) continue;
        const file = resolve(SIDEBAR_DIR, src);
        // vm.Script comparteix l'àmbit lèxic global entre scripts (com <script> reals)
        new vm.Script(readFileSync(file, "utf8"), { filename: file }).runInContext(ctx);
    }

    if (pageText !== null) {
        const page = { title: tabs[0].title, url: tabs[0].url, text: pageText };
        // Les funcions globals dels scripts són propietats de window: es poden substituir
        window.getPageContent = async () => ({ ...page });
    }

    // jsdom dispara el seu propi DOMContentLoaded en acabar d'analitzar el
    // document: si el despatxéssim també nosaltres, sidebar.js s'inicialitzaria
    // dues vegades (listeners duplicats). Només el despatxem si ja ha passat.
    if (window.document.readyState === "complete") {
        window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    } else {
        await new Promise(r => window.addEventListener("load", r, { once: true }));
    }
    const flush = async (n = 5) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
    await flush();

    return { window, document: window.document, calls, flush, close: () => window.close(), storage: window.chrome.storage, onChanged };
}
