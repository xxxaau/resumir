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

function formatObsidianContent(template, metadata) {
    // Extract Executive Summary (Text before first Header)
    let execSummary = metadata.summary || "";
    // Regex: Start of string until first markdown header (###), bold header (**), or list item (-)
    // We want to capture everything BEFORE the first structural element that signifies "Key Points"
    // Valid separators:
    // 1. ### (Standard Markdown Header)
    // 2. ** (Bold Header)
    // 3. ## (Level 2 Header)
    const headerMatch = execSummary.match(/^(###|\*\*|##)/m);
    if (headerMatch) {
        execSummary = execSummary.substring(0, headerMatch.index).trim();
    }
    
    return template
        .replace(/{{title}}/g, metadata.title || "")
        .replace(/{{url}}/g, metadata.url || "")
        .replace(/{{summary}}/g, metadata.summary || "")
        .replace(/{{summary_executive}}/g, execSummary).trim();
}

function formatMarkdownContent(template, metadata) {
    let execSummary = metadata.summary || "";
    // Same improved regex for consistent behavior
    const headerMatch = execSummary.match(/^(###|\*\*|##)/m);
    if (headerMatch) {
        execSummary = execSummary.substring(0, headerMatch.index).trim();
    }

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
        estimateTokens
    };
}
