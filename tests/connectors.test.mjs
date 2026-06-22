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

test("HN: extractHackerNewsFromDOM troba títol i comentaris", async () => {
    loadDom("hackernews-item.html");
    global.fetch = async () => { throw new Error("sense xarxa al test"); }; // aïllem el fetch d'article
    const hn = await extractors.extractHackerNewsFromDOM();
    assert.ok(hn.title && hn.title.length > 0, "ha de trobar un títol");
    assert.ok(hn.comments && hn.comments.includes("- "), "ha de trobar comentaris (.commtext)");
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

test("Readability: extractWithReadability extreu >100 caràcters d'un article", () => {
    const dom = loadDom("article-generic.html");
    // Readability és un global a la pàgina; al test l'injectem des de vendor.
    global.Readability = require("../Readability.js");
    const text = extractors.extractWithReadability();
    assert.ok(text && text.length > 100, "ha d'extreure el cos de l'article");
});
