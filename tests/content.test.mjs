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

// navigator és getter-only a Node 22+: cal defineProperty. Wrapper mutable per poder
// canviar language dins d'un test i restaurar-lo.
const _navState = { language: "en-US" };
Object.defineProperty(global, "navigator", {
    configurable: true,
    get() { return _navState; },
});

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
            contains: async () => true,
        },
        storage: {
            sync: { get: async () => ({}) },
            local: { get: async () => ({}) },
        },
    };
}

// (navigator configurat al principi del fitxer via defineProperty)

const DEFAULT_TAB = { id: 1, url: "https://example.com/article", title: "Article Title" };

global.ext = makeExt({ tabs: [DEFAULT_TAB], scriptResult: "Some page text" });

// Carregar selectYoutubeTrack com a global — al navegador es carrega via <script>
// des de sidebar.html i és un global. En tests l'exposem igual.
const { selectYoutubeTrack } = require("../sidebar/youtube-track-select.js");
global.selectYoutubeTrack = selectYoutubeTrack;

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

// Helper: mock d'ext específic per a tests de YouTube amb la nova arquitectura
// (Step 1 retorna { tracks, activeVssId }, Step 2 retorna { text }).
function makeYoutubeExt(ytTab, step1Result, step2Result, { preferredLangs = [] } = {}) {
    let calls = 0;
    return {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async () => {
                calls++;
                if (calls === 1) return [{ result: step1Result }];
                if (calls === 2 && typeof step2Result === 'string') return [{ result: step2Result }];
                return [{ result: step2Result }];
            },
        },
        permissions: { request: async () => false, contains: async () => true },
        storage: {
            sync: { get: async () => ({ youtubePreferredLangs: preferredLangs }) },
            local: { get: async () => ({}) },
        },
    };
}

test("getPageContent - YouTube sense transcripció retorna descripció com a fallback", async () => {
    const ytTab = { id: 3, url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", title: "Video Title" };
    global.ext = makeYoutubeExt(
        ytTab,
        { hasTracks: false, tracks: [], activeVssId: null },
        "Title: Video Title\n\nDescription:\nDescripció del vídeo molt interessant amb molt de contingut útil."
    );
    const result = await getPageContent();
    assert.ok(result.text.includes("Descripció"), "Ha de retornar la descripció com a fallback de YouTube");
    assert.strictEqual(result.noTranscript, true, "noTranscript ha de ser true quan s'utilitza el fallback");
});

test("getPageContent - YouTube pista ASR única es marca com '(Auto)'", async () => {
    const ytTab = { id: 4, url: "https://www.youtube.com/watch?v=abc12345678", title: "ASR Video" };
    global.ext = makeYoutubeExt(
        ytTab,
        {
            hasTracks: true,
            tracks: [{ lang: 'en', langName: 'English (auto)', vssId: 'a.en', isAsr: true }],
            activeVssId: 'a.en',
        },
        { text: 'hello world ' + 'lorem ipsum '.repeat(20) }
    );
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: en (Auto)]'), "Ha d'incloure '(Auto)' per a pista ASR única");
    assert.ok(result.text.includes('hello world'), "Ha de contenir el text de la transcripció");
});

test("getPageContent - YouTube etiqueta el header segons activeVssId quan existeix", async () => {
    // Nota comportamental: quan activeVssId existeix (player inicialitzat), s'usa aquesta
    // pista per etiquetar el header — és la que el panell modern realment mostrarà.
    const ytTab = { id: 5, url: "https://www.youtube.com/watch?v=xyz12345678", title: "Mixed Video" };
    global.ext = makeYoutubeExt(
        ytTab,
        {
            hasTracks: true,
            tracks: [
                { lang: 'en', langName: 'English (auto)', vssId: 'a.en', isAsr: true },
                { lang: 'en', langName: 'English', vssId: '.en', isAsr: false },
            ],
            activeVssId: '.en',  // pista manual activa al player
        },
        { text: 'content from manual captions '.repeat(5) }
    );
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: en]'), "Ha d'etiquetar 'en' (manual, activa al player)");
    assert.ok(!result.text.includes('(Auto)'), "Capçalera no ha d'incloure '(Auto)' per pista manual");
});

test("getPageContent - YouTube tria per preferència d'usuari quan activeVssId és null", async () => {
    const ytTab = { id: 6, url: "https://www.youtube.com/watch?v=prefCheck01", title: "Preferred Lang" };
    global.ext = makeYoutubeExt(
        ytTab,
        {
            hasTracks: true,
            tracks: [
                { lang: 'de', langName: 'Deutsch', vssId: '.de', isAsr: false },
                { lang: 'en', langName: 'English', vssId: '.en', isAsr: false },
                { lang: 'ca', langName: 'català', vssId: '.ca', isAsr: false },
            ],
            activeVssId: null,  // player no inicialitzat → usar preferences
        },
        { text: 'contingut en català '.repeat(10) },
        { preferredLangs: ['ca', 'es'] }
    );
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: ca]'), "Ha de triar la pista catalana per preferència d'usuari");
});

test("getPageContent - YouTube tria per navigator.language quan activeVssId i preferences buits", async () => {
    const prevLang = _navState.language;
    _navState.language = "ca-ES";
    try {
        const ytTab = { id: 7, url: "https://www.youtube.com/watch?v=browserLang", title: "Browser Lang" };
        global.ext = makeYoutubeExt(
            ytTab,
            {
                hasTracks: true,
                tracks: [
                    { lang: 'de', langName: 'Deutsch', vssId: '.de', isAsr: false },
                    { lang: 'ca', langName: 'català', vssId: '.ca', isAsr: false },
                    { lang: 'en', langName: 'English', vssId: '.en', isAsr: false },
                ],
                activeVssId: null,
            },
            { text: 'text en català del browser '.repeat(5) }
        );
        const result = await getPageContent();
        assert.ok(result.text.startsWith('[TRANSCRIPT: ca]'), "Ha de triar la pista catalana per navigator.language");
    } finally {
        _navState.language = prevLang;
    }
});

test("getPageContent - YouTube: Step 1 falla però Step 2 llegeix segments (Firefox fallback)", async () => {
    // Cas: world:"MAIN" no disponible / falla → meta buit → cal que Step 2 segueixi
    // intentant llegir segments del DOM. Si n'hi ha, s'etiqueta [TRANSCRIPT] genèric.
    const ytTab = { id: 9, url: "https://www.youtube.com/watch?v=ffFallback", title: "FF Fallback" };
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async (inj) => {
                // Step 1 (MAIN) — simula fallada de Firefox
                if (inj.world === "MAIN") throw new Error("Options.world is not supported");
                // Step 2 — retorna segments com si el panell s'hagués obert
                return [{ result: { text: 'transcription content from DOM '.repeat(5) } }];
            },
        },
        permissions: { request: async () => false, contains: async () => true },
        storage: {
            sync: { get: async () => ({}) },
            local: { get: async () => ({}) },
        },
    };
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT]'), "Ha d'etiquetar amb [TRANSCRIPT] genèric quan Step 1 falla");
    assert.ok(!result.text.includes('(Auto)'), "No ha d'incloure (Auto) sense info del kind");
    assert.ok(result.text.includes('transcription content'), "Ha d'incloure els segments");
    assert.ok(!result.noTranscript, "noTranscript ha de ser falsy quan hem obtingut text real");
});

test("getPageContent - YouTube usa prerenderedText de ytInitialData i salta Step 2", async () => {
    // Cas principal: ytInitialData.engagementPanels ja conté la transcripció renderitzada.
    // El codi ha d'usar-la directament i NO intentar obrir cap panell (Step 2 skipped).
    const ytTab = { id: 11, url: "https://www.youtube.com/watch?v=prerenderOK", title: "Pre-rendered Video" };
    let step2Called = false;
    global.ext = {
        tabs: { query: async () => [ytTab], get: async () => ytTab },
        scripting: {
            executeScript: async (inj) => {
                if (inj.world === "MAIN") {
                    return [{ result: {
                        hasTracks: true,
                        tracks: [{ lang: 'ca', langName: 'català', vssId: '.ca', isAsr: false }],
                        activeVssId: '.ca',
                        prerenderedText: 'contingut pre-renderitzat del panell de transcripció '.repeat(5),
                    } }];
                }
                step2Called = true;
                return [{ result: { text: 'should not be used' } }];
            },
        },
        permissions: { request: async () => false, contains: async () => true },
        storage: {
            sync: { get: async () => ({}) },
            local: { get: async () => ({}) },
        },
    };
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: ca]'), "Ha d'etiquetar amb la pista resolta");
    assert.ok(result.text.includes('contingut pre-renderitzat'), "Ha d'incloure el text pre-renderitzat");
    assert.ok(!step2Called, "Step 2 (obrir panell) NO s'ha d'executar quan ja tenim prerenderedText");
});

test("getPageContent - YouTube activeVssId té prioritat sobre preferences", async () => {
    // Vídeo alemany activat al player. Usuari ha configurat 'ca' com preferit però el
    // panell modern ignora setOption → el header ha de reflectir el que el panell mostra (de).
    const ytTab = { id: 8, url: "https://www.youtube.com/watch?v=activeWins", title: "Active Wins" };
    global.ext = makeYoutubeExt(
        ytTab,
        {
            hasTracks: true,
            tracks: [
                { lang: 'de', langName: 'Deutsch', vssId: '.de', isAsr: false },
                { lang: 'ca', langName: 'català', vssId: '.ca', isAsr: false },
            ],
            activeVssId: '.de',
        },
        { text: 'Ich habe gedacht '.repeat(10) },
        { preferredLangs: ['ca'] }
    );
    const result = await getPageContent();
    assert.ok(result.text.startsWith('[TRANSCRIPT: de]'), "Ha d'etiquetar 'de' (pista activa), no 'ca' (preferit)");
});
