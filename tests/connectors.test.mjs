/**
 * tests/connectors.test.mjs
 * Tests de contracte: verifiquen que els selectors dels extractors troben
 * contingut a fixtures HTML/JSON reals. Bloquegen el release si un selector es trenca.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const FIX = resolve(__dirname, "fixtures/connectors");
const readFix = (f) => readFileSync(resolve(FIX, f), "utf8");

const extractors = require("../sidebar/extractors.js");

/** Carrega una fixture HTML i posa document/DOMParser globals (estat de la pàgina). */
function loadDom(file) {
    const dom = new JSDOM(readFix(file));
    global.document = dom.window.document;
    global.DOMParser = dom.window.DOMParser;
    return dom;
}

test("HN: extractHackerNewsFromDOM troba títol, comentaris i articleUrl", () => {
    loadDom("hackernews-item.html");
    const hn = extractors.extractHackerNewsFromDOM();
    assert.ok(hn.title && hn.title.length > 0, "ha de trobar un títol");
    assert.ok(hn.comments && hn.comments.includes("- "), "ha de trobar comentaris (.commtext)");
    // El fetch de l'article NO es fa aquí (els content scripts estan subjectes a
    // CORS); només es retorna la URL, i el sidebar (content.js) fa el fetch.
    assert.equal(hn.articleUrl, "https://lmao.center/blog/wiggle-accidents/", "ha de retornar la URL de l'article extern");
    assert.ok(!("articleText" in hn), "no ha de fer fetch ni retornar articleText");
});

test("Twitter: extractTwitterOG troba og:description", () => {
    loadDom("twitter-thread.html");
    const og = extractors.extractTwitterOG();
    assert.ok(og && og.trim().length > 0, "ha de retornar contingut OG");
});

test("Twitter: scrapeTwitterTweets extreu els tweets del DOM", () => {
    loadDom("twitter-thread.html");
    const scraped = extractors.scrapeTwitterTweets();
    assert.ok(scraped, "ha de retornar contingut (la fixture té [data-testid=tweetText])");
    assert.ok(scraped.includes("milestone") || scraped.length > 20, "ha de contenir el text del tweet");
});

test("LinkedIn: extractLinkedInPost extreu el post de la vista pública", () => {
    loadDom("linkedin-public.html");
    const text = extractors.extractLinkedInPost();
    assert.ok(text && text.trim().length > 30, "ha d'extreure el post (nivell públic o OG)");
});

test("YouTube: readYoutubeCaptionMeta llegeix tracks o prerenderedText de ytInitialData", () => {
    const fix = JSON.parse(readFix("youtube-ytdata.json"));
    // Simulem l'estat de la pàgina de YouTube al MAIN world.
    global.window = {
        ytInitialPlayerResponse: fix.ytInitialPlayerResponse,
        ytInitialData: fix.ytInitialData,
    };
    global.document = { querySelector: () => null }; // #movie_player absent al test
    const meta = extractors.readYoutubeCaptionMeta();
    assert.ok(!meta.error, "no ha de retornar error amb fixture vàlida");
    assert.ok(meta.hasTracks === true || (meta.prerenderedText && meta.prerenderedText.length > 0),
        "ha de detectar pistes o text pre-renderitzat");
});

test("Readability: extractWithReadability extreu >100 caràcters d'un article", () => {
    loadDom("article-generic.html");
    // Readability és un global a la pàgina; al test l'injectem des de vendor.
    global.Readability = require("../Readability.js");
    const text = extractors.extractWithReadability();
    assert.ok(text && text.length > 100, "ha d'extreure el cos de l'article");
});

test("YouTube: formatTimedTranscript posa una marca [m:ss] al principi i cada ~30 s", () => {
    const out = extractors.formatTimedTranscript([
        { startMs: 0, text: "Hola" },
        { startMs: 10_000, text: "món" },
        { startMs: 35_000, text: "segon bloc" },
        { startMs: 3_725_000, text: "molt més tard" },
    ]);
    assert.equal(out, "[0:00] Hola món [0:35] segon bloc [1:02:05] molt més tard");
});

test("YouTube: el text pre-renderitzat conserva els temps dels segments", () => {
    global.window = {
        ytInitialPlayerResponse: {},
        ytInitialData: { engagementPanels: [{ engagementPanelSectionListRenderer: {
            targetId: "engagement-panel-searchable-transcript",
            content: { transcriptRenderer: { content: { transcriptSearchPanelRenderer: { body: { transcriptSegmentListRenderer: {
                initialSegments: [
                    { transcriptSegmentRenderer: { startMs: "0", snippet: { runs: [{ text: "Primer" }] } } },
                    { transcriptSegmentRenderer: { startMs: "40000", snippet: { runs: [{ text: "Segon" }] } } },
                ],
            } } } } } },
        } }] },
    };
    global.document = { querySelector: () => null };
    const meta = extractors.readYoutubeCaptionMeta();
    assert.equal(meta.prerenderedText, "[0:00] Primer [0:40] Segon");
});

test("YouTube: després d'una navegació SPA, les pistes són les del vídeo de la URL i no les del vídeo anterior", () => {
    const track = (v) => ({ baseUrl: `https://www.youtube.com/api/timedtext?v=${v}&lang=es&kind=asr`, vssId: "a.es", languageCode: "es", kind: "asr" });
    const resp = (v) => ({ videoDetails: { videoId: v }, captions: { playerCaptionsTracklistRenderer: { captionTracks: [track(v)] } } });
    global.location = { href: "https://www.youtube.com/watch?v=NOU" };
    // Els globals encara són del vídeo anterior; el reproductor ja és el nou
    global.window = { ytInitialPlayerResponse: resp("ANTIC"), ytInitialData: { currentVideoEndpoint: { watchEndpoint: { videoId: "ANTIC" } } } };
    global.document = { querySelector: () => ({ getPlayerResponse: () => resp("NOU") }) };
    try {
        const meta = extractors.readYoutubeCaptionMeta();
        assert.match(meta.captionBaseUrl, /v=NOU/, "ha de fer servir el vídeo actual");
        // Sense reproductor i amb globals vells: no s'inventa pistes d'un altre vídeo
        global.document = { querySelector: () => null };
        const stale = extractors.readYoutubeCaptionMeta();
        assert.ok(!stale.hasTracks && !stale.captionBaseUrl, "no ha de reutilitzar les pistes del vídeo anterior");
    } finally { delete global.location; }
});
