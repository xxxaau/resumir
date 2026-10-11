/**
 * tests/helpers/settings-harness.mjs
 * Carrega la pàgina de configuració REAL (options/settings.html + els seus
 * scripts, en l'ordre del HTML) a jsdom amb una API d'extensió simulada.
 * Vegeu sidebar-harness.mjs per als detalls (vm.Script, doble DOMContentLoaded).
 */
import { JSDOM } from "jsdom";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createStorageMock } from "./storage-mock.mjs";
import { makeEvent, makeStorageArea } from "./sidebar-harness.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const OPTIONS_DIR = resolve(ROOT, "options");

export async function loadSettings({ sync = {}, local = {}, confirmAnswer = true, fetchHandler = null } = {}) {
    const html = readFileSync(resolve(OPTIONS_DIR, "settings.html"), "utf8");
    const dom = new JSDOM(html, { runScripts: "outside-only", pretendToBeVisual: true, url: "chrome-extension://test/options/settings.html" });
    const { window } = dom;

    const onChanged = makeEvent();
    const calls = { confirms: [], status: [], tabsCreate: [], fetches: [] };
    window.chrome = {
        storage: {
            sync: makeStorageArea("sync", onChanged, sync),
            local: makeStorageArea("local", onChanged, local),
            session: createStorageMock(),
            onChanged,
        },
        runtime: { getURL: (p) => `chrome-extension://test/${p}`, getManifest: () => ({ version: "0.0.0" }), onMessage: makeEvent(), sendMessage: async () => ({}) },
        tabs: { create: async (o) => { calls.tabsCreate.push(o); return { id: 1 }; } },
    };
    if (fetchHandler) window.fetch = async (url, opts) => { calls.fetches.push({ url, headers: opts && opts.headers }); return fetchHandler(url, opts); };
    window.confirm = (msg) => { calls.confirms.push(msg); return confirmAnswer; };
    window.alert = () => {};
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, addEventListener() {} }));

    const ctx = dom.getInternalVMContext();
    const srcs = [...html.matchAll(/<script(?: defer)? src="([^"]+)"><\/script>/g)].map(m => m[1]);
    for (const src of srcs) {
        const file = resolve(OPTIONS_DIR, src);
        new vm.Script(readFileSync(file, "utf8"), { filename: file }).runInContext(ctx);
    }
    if (window.document.readyState === "complete") {
        window.document.dispatchEvent(new window.Event("DOMContentLoaded"));
    } else {
        await new Promise(r => window.addEventListener("load", r, { once: true }));
    }
    const flush = async (n = 8) => { for (let i = 0; i < n; i++) await new Promise(r => setTimeout(r, 0)); };
    await flush();
    return { window, document: window.document, calls, flush, close: () => window.close(), storage: window.chrome.storage };
}
