/**
 * tests/changelog.test.mjs
 * scripts/changelog-lib.mjs: CHANGELOG.md → HTML de l'historial de canvis de
 * la configuració. Regressió (0.13): les línies de continuació es perdien
 * (frases tallades), `<all_urls>` desapareixia (no s'escapava) i es generaven
 * estils inline (#444, #666) il·legibles en el tema fosc.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseChangelog, generateHtml, mdInlineToHtml } from "../scripts/changelog-lib.mjs";

const MD = [
    "# Changelog",
    "",
    "## [2.0.0] - 2026-07-27",
    "",
    "### Afegit",
    "- **Resums de Hacker News.** En resumir un fil amb un article enllaçat,",
    "  ara se n'extreu també el contingut de l'article",
    "  i no només els comentaris.",
    "- Segon canvi simple.",
    "",
    "### Corregit",
    "- Permís `<all_urls>` i `<UNTRUSTED_CONTENT>` (minor)",
    "- Canvi intern de CI (dev)",
    "",
    "## [1.9.0] - 2026-06-01",
    "- sense secció",
    "",
].join("\n");

test("parseChangelog - una línia de continuació s'uneix a l'item (no es talla la frase)", () => {
    const [v] = parseChangelog(MD);
    const first = v.sections[0].items[0];
    assert.match(first, /enllaçat, ara se n'extreu també el contingut de l'article i no només els comentaris\./);
});

test("parseChangelog - el subpunt sagnat s'uneix a l'item pare", () => {
    const [v] = parseChangelog("## [1.0.0] - 2026-01-01\n### Afegit\n- Pare\n  - fill\n- Altre\n");
    assert.equal(v.sections[0].items.length, 2);
    assert.match(v.sections[0].items[0], /Pare; fill/);
});

test("mdInlineToHtml - escapa HTML: <all_urls> no es perd", () => {
    assert.equal(mdInlineToHtml("`<all_urls>`"), "<code>&lt;all_urls&gt;</code>");
    assert.equal(mdInlineToHtml("a < b & c > d"), "a &lt; b &amp; c &gt; d");
});

test("mdInlineToHtml - les etiquetes que genera NO s'escapen", () => {
    assert.equal(mdInlineToHtml("**gras** i *cursiva* i [enllaç](https://x.org)"),
        '<strong>gras</strong> i <em>cursiva</em> i <a href="https://x.org">enllaç</a>');
});

test("generateHtml - amaga els items (minor) i (dev)", () => {
    const html = generateHtml(parseChangelog(MD));
    assert.ok(html.includes("Resums de Hacker News"));
    assert.ok(!html.includes("UNTRUSTED_CONTENT"), "(minor) no s'ha de mostrar");
    assert.ok(!html.includes("Canvi intern de CI"), "(dev) no s'ha de mostrar");
    assert.ok(!html.includes("(minor)") && !html.includes("(dev)"));
});

test("generateHtml - sense estils inline (han de venir de les classes i els tokens del tema)", () => {
    const html = generateHtml(parseChangelog(MD));
    assert.doesNotMatch(html, /style="/);
    assert.match(html, /class="version-entry"/);
    assert.match(html, /class="version-date"/);
});

test("generateHtml - una versió només amb items amagats no es mostra", () => {
    const html = generateHtml(parseChangelog("## [3.0.0] - 2026-01-01\n### Afegit\n- Intern (dev)\n"));
    assert.equal(html, "");
});
