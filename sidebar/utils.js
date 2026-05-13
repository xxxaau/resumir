/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * utils.js - Shared logic for Resumir contingut extension
 * Extracted for testing purposes.
 */

// ISO Week Date functions
function getISOWeekDate(d) {
    const date = new Date(d.valueOf());
    const dayNumber = (d.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNumber + 3);
    const firstThursday = date.valueOf();
    date.setUTCMonth(0, 1);
    if (date.getUTCDay() !== 4) {
      date.setUTCMonth(0, 1 + ((4 - date.getUTCDay()) + 7) % 7);
    }
    const weekNumber = 1 + Math.ceil((firstThursday - date) / 604800000);
    const weekYear = date.getUTCFullYear();
    return { week: weekNumber, year: weekYear };
}

function formatObsidianPath(template, dateObj = new Date()) {
    const now = dateObj;
    
    const tokens = {
        'YYYY': now.getFullYear().toString(),
        'MM': (now.getMonth() + 1).toString().padStart(2, '0'),
        'DD': now.getDate().toString().padStart(2, '0'),
        'HH': now.getHours().toString().padStart(2, '0'),
        'mm': now.getMinutes().toString().padStart(2, '0'),
        // ISO Week Year
        'gggg': () => getISOWeekDate(now).year.toString(),
        // ISO Week Number
        'ww': () => getISOWeekDate(now).week.toString().padStart(2, '0')
    };

    // 1. Handle escaped brackets [text] -> protect them
    // We'll replace them with a placeholder, process date tokens, then restore
    const placeholders = [];
    let processed = template.replace(/\[([^\]]+)\]/g, (match, content) => {
        placeholders.push(content);
        return `__ESC_${placeholders.length - 1}__`;
    });

    // 2. Process Date Tokens
    const tokenRegex = /gggg|YYYY|MM|DD|ww|HH|mm/g;
    
    processed = processed.replace(tokenRegex, (match) => {
        const val = tokens[match];
        return typeof val === 'function' ? val() : val;
    });

    // 3. Restore escaped content
    return processed.replace(/__ESC_(\d+)__/g, (match, index) => {
        return placeholders[index];
    });
}

// Alias for compatibility
const parseObsidianPath = formatObsidianPath;

/**
 * Extreu el resum executiu (text abans del primer encapçalament markdown).
 */
function extractExecutiveSummary(summary) {
    if (!summary) return "";
    const headerMatch = summary.match(/^(###|\*\*|##)/m);
    return headerMatch ? summary.substring(0, headerMatch.index).trim() : summary;
}

function formatObsidianContent(template, metadata) {
    const execSummary = extractExecutiveSummary(metadata.summary);
    
    return template
        .replace(/{{title}}/g, metadata.title || "")
        .replace(/{{url}}/g, metadata.url || "")
        .replace(/{{summary}}/g, metadata.summary || "")
        .replace(/{{summary_executive}}/g, execSummary).trim();
}

function formatMarkdownContent(template, metadata) {
    const execSummary = extractExecutiveSummary(metadata.summary);

    return template
        .replace(/{{title}}/g, metadata.title || "")
        .replace(/{{url}}/g, metadata.url || "")
        .replace(/{{summary}}/g, metadata.summary || "")
        .replace(/{{summary_executive}}/g, execSummary);
}

// Token Estimation (Simple char count / 4)
function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

// Export for Node.js testing environment if needed, otherwise global in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getISOWeekDate,
        formatObsidianPath,
        parseObsidianPath,
        formatObsidianContent,
        formatMarkdownContent,
        extractExecutiveSummary,
        estimateTokens
    };
}
