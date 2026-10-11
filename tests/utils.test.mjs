/**
 * tests/utils.test.mjs
 * Tests unitaris per a sidebar/utils.js
 * Execució: node --test tests/utils.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
    getISOWeekDate,
    formatObsidianPath,
    formatObsidianContent,
    formatMarkdownContent,
    getSourceHttpUrl,
    estimateTokens,
} = require("../sidebar/utils.js");

// ---------------------------------------------------------------------------
// getISOWeekDate
// ---------------------------------------------------------------------------

test("getISOWeekDate - data estàndard (2024-02-29 = setmana 9)", () => {
    const d = new Date("2024-02-29T12:00:00Z");
    const result = getISOWeekDate(d);
    assert.equal(result.year, 2024);
    assert.equal(result.week, 9);
});

test("getISOWeekDate - límit d'any (2023-01-01 pertany a la setmana 52 de 2022)", () => {
    const d = new Date("2023-01-01T12:00:00Z");
    const result = getISOWeekDate(d);
    assert.equal(result.year, 2022);
    assert.equal(result.week, 52);
});

// ---------------------------------------------------------------------------
// formatObsidianPath
// ---------------------------------------------------------------------------

test("formatObsidianPath - substitució bàsica de data", () => {
    const date = new Date("2026-02-13T10:30:00");
    const result = formatObsidianPath("Notes/YYYY/MM-DD", date);
    assert.equal(result, "Notes/2026/02-13");
});

test("formatObsidianPath - tokens de setmana ISO", () => {
    const date = new Date("2026-02-13T10:30:00"); // divendres, setmana 7
    const result = formatObsidianPath("Journal/gggg/Week-ww", date);
    assert.equal(result, "Journal/2026/Week-07");
});

test("formatObsidianPath - claudàtors escapats [text]", () => {
    const date = new Date("2026-02-13T10:30:00");
    const result = formatObsidianPath("[My Notes]/YYYY/[Daily Note]", date);
    assert.equal(result, "My Notes/2026/Daily Note");
});

test("formatObsidianPath - tokens d'hora HH i mm", () => {
    const date = new Date("2026-02-13T14:30:00");
    const result = formatObsidianPath("Notes/YYYY-MM-DD_HH-mm", date);
    assert.equal(result, "Notes/2026-02-13_14-30");
});

// ---------------------------------------------------------------------------
// formatObsidianContent
// ---------------------------------------------------------------------------

test("formatObsidianContent - substitució completa de variables", () => {
    const metadata = {
        title: "Test Page",
        url: "https://example.com",
        summary: "This is a summary.\n\n### Punts Clau\n- Point 1",
    };
    const result = formatObsidianContent(
        "# {{title}}\nLink: {{url}}\n\n{{summary_executive}}",
        metadata
    );
    assert.equal(result, "# Test Page\nLink: https://example.com\n\nThis is a summary.");
});

test("formatObsidianContent - capçalera en negreta (**Bold**) com a separador", () => {
    const metadata = {
        title: "Bold Test",
        url: "https://example.com",
        summary: "Executive summary here.\n\n**Key Points**\n- Point 1",
    };
    const result = formatObsidianContent("{{summary_executive}}", metadata);
    assert.equal(result, "Executive summary here.");
});

test("formatObsidianContent - metadata buida no llança error", () => {
    const result = formatObsidianContent("{{title}} - {{url}}", {});
    assert.equal(result, "-");
});

test("formatObsidianContent - sense capçaleres retorna el resum complet", () => {
    const metadata = {
        title: "No Headers Test",
        summary: "This is a plain summary with no extra headers to split on.",
    };
    const result = formatObsidianContent("{{summary_executive}}", metadata);
    assert.equal(result, "This is a plain summary with no extra headers to split on.");
});

test("formatObsidianContent - capçalera H2 (##) com a separador", () => {
    const metadata = {
        summary: "Executive summary here.\n\n## Secció 1\nContingut...",
    };
    const result = formatObsidianContent("{{summary_executive}}", metadata);
    assert.equal(result, "Executive summary here.");
});

// ---------------------------------------------------------------------------
// formatMarkdownContent
// ---------------------------------------------------------------------------

test("formatMarkdownContent - substitució bàsica amb {{summary}}", () => {
    const metadata = {
        title: "MD Test Page",
        url: "https://example.com/md",
        summary: "Full summary text.\n\n### Punts Clau\n- MD Point 1",
    };
    const result = formatMarkdownContent(
        "# [{{title}}]({{url}})\n\n{{summary}}",
        metadata
    );
    assert.equal(
        result,
        "# [MD Test Page](https://example.com/md)\n\nFull summary text.\n\n### Punts Clau\n- MD Point 1"
    );
});

test("formatMarkdownContent - extracció d'executive summary", () => {
    const metadata = {
        title: "Exec Test",
        summary: "Short intro.\n\n**Key Points**\n- Point A",
    };
    const result = formatMarkdownContent("{{title}}\n\n{{summary_executive}}", metadata);
    assert.equal(result, "Exec Test\n\nShort intro.");
});

// ---------------------------------------------------------------------------
// estimateTokens
// ---------------------------------------------------------------------------

test("estimateTokens - càlcul bàsic (8 caràcters = 2 tokens)", () => {
    assert.equal(estimateTokens("12345678"), 2);
});

test("estimateTokens - arrodoniment cap amunt (5 caràcters → 2 tokens)", () => {
    assert.equal(estimateTokens("12345"), 2);
});

test("estimateTokens - entrada null retorna 0", () => {
    assert.equal(estimateTokens(null), 0);
});

test("estimateTokens - cadena buida retorna 0", () => {
    assert.equal(estimateTokens(""), 0);
});

test("estimateTokens - text llarg (4000 caràcters = 1000 tokens)", () => {
    assert.equal(estimateTokens("a".repeat(4000)), 1000);
});

// ---------------------------------------------------------------------------
// Regressió (0.8): la URL de la clau de memòria cau ("seleccio:…", "pdf-local:…")
// no pot arribar com a enllaç a les exportacions ni al títol.
// ---------------------------------------------------------------------------

test("getSourceHttpUrl - http(s) tal qual; «seleccio:» se'n treu el prefix", () => {
    assert.equal(getSourceHttpUrl("https://example.com/a?b=1"), "https://example.com/a?b=1");
    assert.equal(getSourceHttpUrl("http://example.com"), "http://example.com");
    assert.equal(getSourceHttpUrl("seleccio:https://example.com/a"), "https://example.com/a");
});

test("getSourceHttpUrl - pdf-local, esquemes no web i entrades invàlides donen buit", () => {
    for (const bad of ["pdf-local:informe.pdf", "javascript:alert(1)", "file:///etc/passwd",
        "seleccio:pdf-local:x.pdf", "", "no és una url", undefined, null, 42]) {
        assert.equal(getSourceHttpUrl(bad), "", String(bad));
    }
});

test("formatMarkdownContent - un enllaç «seleccio:» s'exporta amb l'URL real", () => {
    const md = formatMarkdownContent("# [{{title}}]({{url}})\n\n{{summary}}", {
        title: "Selecció", url: "seleccio:https://example.com/p", summary: "Text.",
    });
    assert.equal(md, "# [Selecció](https://example.com/p)\n\nText.");
    assert.ok(!md.includes("seleccio:"));
});

test("formatMarkdownContent - un PDF local no genera un enllaç mort: el títol queda en text pla", () => {
    const md = formatMarkdownContent("# [{{title}}]({{url}})\n\n{{summary}}", {
        title: "Informe", url: "pdf-local:informe.pdf", summary: "Text.",
    });
    assert.equal(md, "# Informe\n\nText.");
});

test("formatObsidianContent - un PDF local no genera un enllaç mort", () => {
    const out = formatObsidianContent("- [{{title}}]({{url}})\n\t- {{summary_executive}}", {
        title: "Informe", url: "pdf-local:informe.pdf", summary: "Resum curt.",
    });
    assert.equal(out, "- Informe\n\t- Resum curt.");
});

test("formatMarkdownContent - amb URL http(s) l'enllaç no canvia", () => {
    const md = formatMarkdownContent("[{{title}}]({{url}})", { title: "T", url: "https://x.org", summary: "" });
    assert.equal(md, "[T](https://x.org)");
});
