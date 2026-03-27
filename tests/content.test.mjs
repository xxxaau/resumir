/**
 * tests/content.test.mjs
 * Tests unitaris per a sidebar/content.js
 * Execució: node --test tests/content.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

// Configurar DOM global via jsdom (necessari per DOMParser a YouTube path)
const dom = new JSDOM("<!DOCTYPE html><body></body>");
global.document = dom.window.document;
global.DOMParser = dom.window.DOMParser;

const require = createRequire(import.meta.url);

// ---------------------------------------------------------------------------
// Mock d'ext — redefinit per test via helpers
// ---------------------------------------------------------------------------

function makeExt({ tabs = [], scriptResult = null, scriptError = null, permissionGranted = false } = {}) {
    let callCount = 0;
    return {
        tabs: {
            query: async () => tabs,
            get: async (id) => tabs.find(t => t.id === id) || { id, url: "https://example.com" },
        },
        scripting: {
            executeScript: async () => {
                if (scriptError) {
                    if (callCount++ === 0) throw scriptError;
                }
                if (scriptResult !== null) return [{ result: scriptResult }];
                return [{ result: null }];
            },
        },
        permissions: {
            request: async () => permissionGranted,
        },
    };
}

const DEFAULT_TAB = { id: 1, url: "https://example.com/article", title: "Article Title" };

global.ext = makeExt({ tabs: [DEFAULT_TAB], scriptResult: "Some page text" });

const { executeScriptSafe, getPageContent } = require("../sidebar/content.js");

// ---------------------------------------------------------------------------
// executeScriptSafe
// ---------------------------------------------------------------------------

test("executeScriptSafe - retorna el resultat quan scripting té èxit", async () => {
    global.ext = makeExt({ tabs: [DEFAULT_TAB], scriptResult: "resultat" });
    const res = await executeScriptSafe({ target: { tabId: 1 }, func: () => "resultat" });
    assert.deepEqual(res, [{ result: "resultat" }]);
});

test("executeScriptSafe - retorna null quan el permís és denegat per l'usuari", async () => {
    global.ext = makeExt({
        tabs: [DEFAULT_TAB],
        scriptError: new Error("Missing host permission for tab"),
        permissionGranted: false,
    });
    const res = await executeScriptSafe({ target: { tabId: 1 }, func: () => {} });
    assert.equal(res, null);
});

test("executeScriptSafe - atorga permís i reintenta quan l'usuari accepta", async () => {
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [DEFAULT_TAB], get: async () => DEFAULT_TAB },
        scripting: {
            executeScript: async () => {
                if (calls++ === 0) throw new Error("Missing host permission for tab");
                return [{ result: "retry-ok" }];
            },
        },
        permissions: { request: async () => true },
    };
    const res = await executeScriptSafe({ target: { tabId: 1 }, func: () => {} });
    assert.deepEqual(res, [{ result: "retry-ok" }]);
});

test("executeScriptSafe - propaga errors que no són de permisos", async () => {
    global.ext = makeExt({
        tabs: [DEFAULT_TAB],
        scriptError: new Error("Unexpected scripting error"),
    });
    await assert.rejects(
        () => executeScriptSafe({ target: { tabId: 1 }, func: () => {} }),
        /Unexpected scripting error/
    );
});

// ---------------------------------------------------------------------------
// getPageContent — cas estàndard
// ---------------------------------------------------------------------------

test("getPageContent - llança [004] quan no hi ha cap pestanya activa", async () => {
    global.ext = makeExt({ tabs: [] });
    await assert.rejects(
        () => getPageContent(),
        /\[004\]/
    );
});

test("getPageContent - retorna title, url i text per a una pàgina estàndard", async () => {
    global.ext = makeExt({ tabs: [DEFAULT_TAB], scriptResult: "Contingut de la pàgina" });
    const result = await getPageContent();
    assert.equal(result.title, "Article Title");
    assert.equal(result.url, "https://example.com/article");
    assert.ok(result.text.length > 0);
});

test("getPageContent - llança [006] quan no s'extreu cap text", async () => {
    global.ext = makeExt({ tabs: [DEFAULT_TAB], scriptResult: null });
    await assert.rejects(
        () => getPageContent(),
        /\[006\]/
    );
});

// ---------------------------------------------------------------------------
// getPageContent — Hacker News
// ---------------------------------------------------------------------------

test("getPageContent - detecta URL de HN i retorna el contingut del thread", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: "Title: Article\n\nTop Discussion Comments:\n- Un comentari interessant",
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("Top Discussion Comments"), "Ha de retornar contingut del thread HN");
});

// ---------------------------------------------------------------------------
// getPageContent — YouTube (fallback descripció)
// ---------------------------------------------------------------------------

test("getPageContent - detecta URL de YouTube i intenta extreure transcripció", async () => {
    const ytTab = { id: 3, url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Video Title" };
    // Simula que cap mètode de transcripció funciona però la descripció sí
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                // API MAIN world: no captions
                if (calls === 1) return [{ result: null }];
                // UI transcript panel: empty
                if (calls === 2) return [{ result: null }];
                // Description fallback
                return [{ result: "Title: Video Title\n\nDescription:\nDescripció del vídeo molt interessant amb molt de contingut útil." }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.includes("Descripció"), "Ha de retornar la descripció com a fallback de YouTube");
});
