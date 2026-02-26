/**
 * test_logic.js
 * Unit tests for keys logic in utils.js
 */

const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function assertEquals(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(message || `Expected '${expected}' but got '${actual}'`);
    }
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || "Assertion failed");
    }
}

// --- Test Cases ---

// 1. ISO Week Date
test("getISOWeekDate - Standard Date", () => {
    // 4th Feb 2026 is a Wednesday.
    // 2026 starts on Thursday (Week 1 includes Jan 1-4)
    // Let's pick a known date: 2024-02-29 (Thursday) -> Week 9 of 2024
    const d = new Date("2024-02-29T12:00:00Z");
    const result = getISOWeekDate(d);
    assertEquals(result.year, 2024, "Year should be 2024");
    assertEquals(result.week, 9, "Week should be 9");
});

test("getISOWeekDate - Year Boundary (Early Jan)", () => {
    // Jan 1st 2023 was a Sunday. Belongs to last week of 2022 (Week 52)? 
    // Wait, ISO weeks start on Monday. 
    // Jan 1 2023 (Sun) -> Week 52 of 2022.
    const d = new Date("2023-01-01T12:00:00Z");
    const result = getISOWeekDate(d);
    assertEquals(result.year, 2022, "Year should be 2022 for Jan 1st 2023");
    assertEquals(result.week, 52, "Week should be 52");
});

// 2. Obsidian Path Formatting
test("formatObsidianPath - Basic Replacement", () => {
    const date = new Date("2026-02-13T10:30:00"); // Fixed date for test
    const template = "Notes/YYYY/MM-DD";
    const result = formatObsidianPath(template, date);
    assertEquals(result, "Notes/2026/02-13", "Basic date replacement failed");
});

test("formatObsidianPath - ISO Week Replacement", () => {
    const date = new Date("2026-02-13T10:30:00"); // Friday, Feb 13 2026 -> Week 7
    const template = "Journal/gggg/Week-ww";
    const result = formatObsidianPath(template, date);
    assertEquals(result, "Journal/2026/Week-07", "ISO Week replacement failed");
});

test("formatObsidianPath - Escaped Brackets", () => {
    const date = new Date("2026-02-13T10:30:00");
    const template = "[My Notes]/YYYY/[Daily Note]";
    const result = formatObsidianPath(template, date);
    assertEquals(result, "My Notes/2026/Daily Note", "Bracket escaping failed");
});

// 3. Obsidian Content Formatting
test("formatObsidianContent - Full Substitution", () => {
    const metadata = {
        title: "Test Page",
        url: "https://example.com",
        summary: "This is a summary.\n\n### Punts Clau\n- Point 1"
    };
    const template = "# {{title}}\nLink: {{url}}\n\n{{summary_executive}}";
    
    const result = formatObsidianContent(template, metadata);
    const expected = "# Test Page\nLink: https://example.com\n\nThis is a summary.";
    
    assertEquals(result, expected, "Content substitution logic failed");
});

test("formatObsidianContent - Bold Header Split", () => {
    // Sometimes models use **Header** instead of ### Header
    const metadata = {
        title: "Bold Test",
        url: "https://example.com",
        summary: "Executive summary here.\n\n**Key Points**\n- Point 1"
    };
    const template = "{{summary_executive}}";
    const result = formatObsidianContent(template, metadata);
    assertEquals(result, "Executive summary here.", "Should split at bold headers too");
});

test("formatObsidianContent - Empty Metadata", () => {
    const metadata = {};
    const template = "{{title}} - {{url}}";
    const result = formatObsidianContent(template, metadata);
    assertEquals(result, "-", "Should handle undefined metadata gracefully");
});

test("formatObsidianContent - No Headers", () => {
    const metadata = {
        title: "No Headers Test",
        summary: "This is a plain summary with no extra headers to split on."
    };
    const template = "{{summary_executive}}";
    const result = formatObsidianContent(template, metadata);
    assertEquals(result, "This is a plain summary with no extra headers to split on.", "Should return full summary if no headers");
});

test("formatObsidianContent - Level 2 Header Split", () => {
    const metadata = {
        summary: "Executive summary here.\n\n## Secció 1\nContingut..."
    };
    const template = "{{summary_executive}}";
    const result = formatObsidianContent(template, metadata);
    assertEquals(result, "Executive summary here.", "Should split at H2 headers (##)");
});

// 4. Markdown Content Formatting
test("formatMarkdownContent - Basic Substitution", () => {
    const metadata = {
        title: "MD Test Page",
        url: "https://example.com/md",
        summary: "Full summary text.\n\n### Punts Clau\n- MD Point 1"
    };
    const template = "# [{{title}}]({{url}})\n\n{{summary}}";
    const result = formatMarkdownContent(template, metadata);
    const expected = "# [MD Test Page](https://example.com/md)\n\nFull summary text.\n\n### Punts Clau\n- MD Point 1";
    
    assertEquals(result, expected, "Markdown general substitution failed");
});

test("formatMarkdownContent - Executive Summary Extraction", () => {
    const metadata = {
        title: "Exec Test",
        summary: "Short intro.\n\n**Key Points**\n- Point A"
    };
    const template = "{{title}}\n\n{{summary_executive}}";
    const result = formatMarkdownContent(template, metadata);
    assertEquals(result, "Exec Test\n\nShort intro.", "Markdown executive summary extraction failed");
});

// 5. Token Estimation
test("estimateTokens - Basic calculation", () => {
    const text = "12345678"; // 8 chars
    assertEquals(estimateTokens(text), 2, "Should be 2 tokens");
});

test("estimateTokens - Rounding up", () => {
    const text = "12345"; // 5 chars
    assertEquals(estimateTokens(text), 2, "Should round up 1.25 to 2");
});

test("estimateTokens - Null input", () => {
    assertEquals(estimateTokens(null), 0, "null should return 0");
});

test("estimateTokens - Empty string", () => {
    assertEquals(estimateTokens(""), 0, "Empty string should return 0");
});

test("estimateTokens - Long text", () => {
    const text = "a".repeat(4000); // 4000 chars
    assertEquals(estimateTokens(text), 1000, "Should be 1000 tokens for 4000 chars");
});

// 6. getCuratedModelInfo
test("getCuratedModelInfo - Known model", () => {
    const info = getCuratedModelInfo("gemini-2.0-flash");
    assertEquals(info.label, "Gemini 2.0 Flash", "Should return correct label");
    assert(info.rpd === 1500, "Should have 1500 rpd");
    assert(info.priceIn > 0, "Price should be positive");
});

test("getCuratedModelInfo - Unknown model fallback", () => {
    const info = getCuratedModelInfo("some-unknown-model-xyz");
    assertEquals(info.label, "some-unknown-model-xyz", "Should use model ID as label");
    assertEquals(info.rpd, 1500, "Should fallback to 1500 rpd");
});

test("getCuratedModelInfo - Model with suffix variant", () => {
    const info = getCuratedModelInfo("gemini-2.5-flash-latest");
    assertEquals(info.label, "Gemini 2.5 Flash", "Should match base model despite -latest suffix");
});

// 7. formatObsidianPath - Time tokens
test("formatObsidianPath - Time tokens HH:mm", () => {
    const date = new Date("2026-02-13T14:30:00");
    const template = "Notes/YYYY-MM-DD_HH-mm";
    const result = formatObsidianPath(template, date);
    assertEquals(result, "Notes/2026-02-13_14-30", "Time tokens should be replaced");
});

// 8. classifyError
test("classifyError - Invalid API key (401)", () => {
    const result = classifyError(new Error("Error API (401): API key not valid"));
    assert(result.showConfig === true, "Should show config button for 401");
    assert(result.message.includes("clau API"), "Should mention API key in Catalan");
});

test("classifyError - Permission denied", () => {
    const result = classifyError(new Error("Permission denied"));
    assert(result.showConfig === true, "Should show config for permission errors");
    assert(result.message.includes("permisos"), "Should mention permissions");
});

// --- Test Runner ---
(async function runTests() {
    const resultsDiv = document.getElementById("results");
    const summaryDiv = document.getElementById("summary");
    
    let passed = 0;
    let failed = 0;

    const groupDiv = document.createElement("div");
    groupDiv.className = "test-group";
    const h2 = document.createElement("h2");
    h2.textContent = "Logic Tests";
    groupDiv.appendChild(h2);

    for (const t of tests) {
        const row = document.createElement("div");
        row.className = "test-case";
        
        const statusSpan = document.createElement("span");
        const nameSpan = document.createElement("span");
        nameSpan.className = "name";
        nameSpan.textContent = t.name;
        
        try {
            await t.fn();
            statusSpan.className = "status pass";
            statusSpan.textContent = "PASS";
            passed++;
        } catch (e) {
            statusSpan.className = "status fail";
            statusSpan.textContent = "FAIL";
            
            const errorSpan = document.createElement("span");
            errorSpan.className = "error";
            errorSpan.textContent = e.message;
            nameSpan.appendChild(document.createElement("br"));
            nameSpan.appendChild(errorSpan);
            
            failed++;
            console.error(e);
        }
        
        row.appendChild(statusSpan);
        row.appendChild(nameSpan);
        groupDiv.appendChild(row);
    }
    
    resultsDiv.appendChild(groupDiv);
    
    summaryDiv.textContent = `Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`;
    summaryDiv.style.color = failed === 0 ? "#28a745" : "#dc3545";
})();
