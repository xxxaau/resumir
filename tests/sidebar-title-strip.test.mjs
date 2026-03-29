// tests/sidebar-title-strip.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

function setupDOM() {
    const dom = new JSDOM(`<!DOCTYPE html>
    <body>
      <div id="page-title-strip" class="hidden">
        <a id="page-title-link" href="#" target="_blank"></a>
      </div>
    </body>`);
    return dom.window.document;
}

function showPageTitleStrip(title, url) {
    const strip = document.getElementById("page-title-strip");
    const link  = document.getElementById("page-title-link");
    if (!strip || !link) return;
    link.textContent = title || url;
    link.href = url || "#";
    strip.classList.remove("hidden");
}

function hidePageTitleStrip() {
    const strip = document.getElementById("page-title-strip");
    if (strip) strip.classList.add("hidden");
}

test("showPageTitleStrip mostra la franja amb títol i URL", () => {
    const doc = setupDOM();
    global.document = doc;
    showPageTitleStrip("Títol de prova", "https://example.com/pagina");
    const strip = doc.getElementById("page-title-strip");
    const link  = doc.getElementById("page-title-link");
    assert.ok(!strip.classList.contains("hidden"));
    assert.equal(link.textContent, "Títol de prova");
    assert.equal(link.href, "https://example.com/pagina");
});

test("showPageTitleStrip fa servir la URL com a fallback si no hi ha títol", () => {
    const doc = setupDOM();
    global.document = doc;
    showPageTitleStrip("", "https://example.com/pagina");
    const link = doc.getElementById("page-title-link");
    assert.equal(link.textContent, "https://example.com/pagina");
});

test("hidePageTitleStrip oculta la franja", () => {
    const doc = setupDOM();
    global.document = doc;
    showPageTitleStrip("Títol", "https://example.com");
    hidePageTitleStrip();
    const strip = doc.getElementById("page-title-strip");
    assert.ok(strip.classList.contains("hidden"));
});
