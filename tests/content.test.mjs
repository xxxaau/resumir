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
// getPageContent — Hacker News (actualitzat)
// ---------------------------------------------------------------------------

test("getPageContent - HN retorna discussió sense article quan articleUrl és null", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: { title: "Article Title", articleUrl: null, comments: "- Un comentari interessant" },
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("Top Discussion Comments"), "Ha de retornar discussió HN sense article");
    assert.ok(result.text.includes("Un comentari interessant"), "Ha d'incloure els comentaris");
});

test("getPageContent - HN combina article i discussió quan articleUrl és extern", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    const articleHtml = "<html><body><p>" + "Text de l'article. ".repeat(20) + "</p></body></html>";
    global.fetch = async () => ({ ok: true, text: async () => articleHtml });
    global.Readability = class {
        constructor(doc) { this._doc = doc; }
        parse() { return { textContent: "Text de l'article. ".repeat(20) }; }
    };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: { title: "Article Title", articleUrl: "https://example.com/article", comments: "- Comentari sobre l'article" },
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("ARTICLE:"), "Ha d'incloure la secció ARTICLE");
    assert.ok(result.text.includes("HACKER NEWS DISCUSSION:"), "Ha d'incloure la secció HN DISCUSSION");
    assert.ok(result.text.includes("Text de l'article"), "Ha d'incloure el text de l'article");
    assert.ok(result.text.includes("Comentari sobre l'article"), "Ha d'incloure la discussió HN");
});

test("getPageContent - HN degrada gracefully quan el fetch de l'article falla", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    global.fetch = async () => { throw new Error("Network error"); };
    global.Readability = class { parse() { return null; } };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: { title: "Article Title", articleUrl: "https://example.com/article", comments: "- Comentari de fallback" },
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("Top Discussion Comments"), "Ha de mostrar discussió sola si fetch falla");
    assert.ok(result.text.includes("Comentari de fallback"), "Ha d'incloure els comentaris");
    assert.ok(!result.text.includes("ARTICLE:"), "No ha d'incloure secció ARTICLE si fetch falla");
});

test("getPageContent - HN degrada gracefully quan l'article retorna error HTTP", async () => {
    const hnTab = { id: 2, url: "https://news.ycombinator.com/item?id=12345", title: "HN Thread" };
    global.fetch = async () => ({ ok: false, status: 404, text: async () => "" });
    global.Readability = class { parse() { return null; } };
    global.ext = makeExt({
        tabs: [hnTab],
        scriptResult: { title: "Article Title", articleUrl: "https://example.com/article", comments: "- Comentari HTTP error" },
    });
    const result = await getPageContent();
    assert.ok(result.text.includes("Top Discussion Comments"), "Ha de mostrar discussió sola si HTTP error");
    assert.ok(!result.text.includes("ARTICLE:"), "No ha d'incloure secció ARTICLE si HTTP error");
});

// ---------------------------------------------------------------------------
// getPageContent — YouTube (fallback descripció)
// ---------------------------------------------------------------------------

test("getPageContent - YouTube sense transcripció retorna descripció com a fallback", async () => {
    const ytTab = { id: 3, url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Video Title" };
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                // Step 1: sense pistes
                if (calls === 1) return [{ result: { hasTracks: false, tracks: [] } }];
                // Fallback descripció
                return [{ result: "Title: Video Title\n\nDescription:\nDescripció del vídeo molt interessant amb molt de contingut útil." }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.includes("Descripció"), "Ha de retornar la descripció com a fallback de YouTube");
    assert.strictEqual(result.noTranscript, true, "noTranscript ha de ser true quan s'utilitza el fallback");
});

test("getPageContent - YouTube pista ASR única es marca com '(Auto)'", async () => {
    const ytTab = { id: 4, url: "https://www.youtube.com/watch?v=abc12345678", title: "ASR Video" };
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                // Step 1: pista única ASR
                if (calls === 1) return [{ result: { hasTracks: true, tracks: [{ lang: 'en', name: 'English (auto-generated)', isAsr: true }] } }];
                // Step 2: text + nom del selector
                return [{ result: { text: 'hello world ' + 'lorem ipsum '.repeat(20), activeName: 'English (auto-generated)' } }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: en (Auto)]'), "Ha d'incloure '(Auto)' per a pista ASR única");
    assert.ok(result.text.includes('hello world'), "Ha de contenir el text de la transcripció");
});

test("getPageContent - YouTube prefereix pista manual quan hi ha ASR i manual", async () => {
    const ytTab = { id: 5, url: "https://www.youtube.com/watch?v=xyz12345678", title: "Mixed Video" };
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                // Step 1: ASR al [0] i manual al [1]
                if (calls === 1) return [{
                    result: { hasTracks: true, tracks: [
                        { lang: 'en', name: 'English (auto-generated)', isAsr: true },
                        { lang: 'en', name: 'English', isAsr: false },
                    ] }
                }];
                // Step 2: sense nom actiu (panell modern) — heurística hauria de triar la manual
                return [{ result: { text: 'content from manual captions '.repeat(5), activeName: '' } }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: en]'), "No ha d'incloure '(Auto)' si existeix pista manual");
    assert.ok(!result.text.includes('(Auto)'), "Capçalera no ha d'incloure '(Auto)'");
});

test("getPageContent - YouTube casa el selector actiu amb la pista corresponent (panell clàssic)", async () => {
    const ytTab = { id: 6, url: "https://www.youtube.com/watch?v=abcDEF12345", title: "Classic Panel Video" };
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                // Step 1: ASR al [0], manual al [1] — si el selector indica ASR, ha d'anar a ASR
                if (calls === 1) return [{
                    result: { hasTracks: true, tracks: [
                        { lang: 'en', name: 'English (auto-generated)', isAsr: true },
                        { lang: 'en', name: 'English', isAsr: false },
                    ] }
                }];
                // Selector indica la pista ASR com a activa
                return [{ result: { text: 'asr content '.repeat(10), activeName: 'English (auto-generated)' } }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: en (Auto)]'), "Selector explícit d'ASR ha de marcar '(Auto)'");
});

test("getPageContent - YouTube ignora pistes amb nom buit al match de selector", async () => {
    // Regressió: ''.includes('') és true, i activeName.includes('') també, cosa que feia
    // que la primera pista sempre guanyés si tenia name buit. Ha de saltar a l'heurística
    // de preferir no-ASR.
    const ytTab = { id: 7, url: "https://www.youtube.com/watch?v=emptyName12", title: "Empty Name Video" };
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                if (calls === 1) return [{
                    result: { hasTracks: true, tracks: [
                        { lang: 'en', name: '', isAsr: true },
                        { lang: 'ca', name: 'català', isAsr: false },
                    ] }
                }];
                // Selector buit (panell modern): cau a l'heurística no-ASR, NO a tracks[0].
                return [{ result: { text: 'text de prova '.repeat(10), activeName: '' } }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: ca]'), "Ha de triar la pista catalana manual, no l'ASR anglesa amb nom buit");
    assert.ok(!result.text.includes('(Auto)'), "No s'ha de marcar com a '(Auto)'");
});

test("getPageContent - YouTube evita que 'English' matchi 'English (auto-generated)' per substring", async () => {
    // Regressió: l'ordre d'insercio pot fer que el nom curt es comprovi primer.
    // Si ordenem per longitud desc, el nom més llarg guanya.
    const ytTab = { id: 8, url: "https://www.youtube.com/watch?v=substrCheck", title: "Substring Check" };
    let calls = 0;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                if (calls === 1) return [{
                    result: { hasTracks: true, tracks: [
                        { lang: 'en', name: 'English', isAsr: false },           // Manual primer
                        { lang: 'en', name: 'English (auto-generated)', isAsr: true },
                    ] }
                }];
                // Selector explícit: track ASR llarg és l'actiu
                return [{ result: { text: 'contingut asr '.repeat(10), activeName: 'English (auto-generated)' } }];
            },
        },
        permissions: { request: async () => false },
    };
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: en (Auto)]'), "Ha de triar el match més llarg (ASR), no el curt (English)");
});
