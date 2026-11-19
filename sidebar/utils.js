/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * utils.js - Shared logic for Resumir extension
 * Extracted for testing purposes.
 */

// ISO Week Date functions

/** Setmana ISO a partir d'any/mes/dia de calendari (mes 1-12). */
function isoWeekFromYMD(year, month, day) {
    const date = new Date(Date.UTC(year, month - 1, day));
    date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
    const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
    const week = Math.ceil(((date.valueOf() - yearStart) / 86400000 + 1) / 7);
    return { week, year: date.getUTCFullYear() };
}

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
    // La setmana ISO es deriva de la mateixa data de calendari local que la
    // resta de tokens; getISOWeekDate fa aritmètica UTC i a la mitjanit local
    // donava la setmana anterior.
    const iso = isoWeekFromYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());

    const tokens = {
        'YYYY': now.getFullYear().toString(),
        'MM': (now.getMonth() + 1).toString().padStart(2, '0'),
        'DD': now.getDate().toString().padStart(2, '0'),
        'HH': now.getHours().toString().padStart(2, '0'),
        'mm': now.getMinutes().toString().padStart(2, '0'),
        // ISO Week Year
        'gggg': () => iso.year.toString(),
        // ISO Week Number
        'ww': () => iso.week.toString().padStart(2, '0')
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

// La URL guardada a `metadata.url`/historial és també la CLAU de memòria cau i
// pot dur prefixos interns ("seleccio:https://…", "pdf-local:nom.pdf"). Per a
// enllaços visibles o exportats només serveix l'URL http(s) real; si no n'hi ha
// (PDF local), retorna "" i el cridant ha de mostrar text pla, no un enllaç mort.
function getSourceHttpUrl(url) {
    if (typeof url !== "string") return "";
    const raw = url.startsWith("seleccio:") ? url.slice("seleccio:".length) : url;
    try {
        const parsed = new URL(raw);
        return (parsed.protocol === "http:" || parsed.protocol === "https:") ? raw : "";
    } catch {
        return "";
    }
}

// Sense URL, `[{{title}}]({{url}})` quedaria com `[títol]()`: es degrada a text pla.
function applyUrlToTemplate(template, rawUrl) {
    const url = getSourceHttpUrl(rawUrl);
    const base = url ? template : template.replace(/\[([^\]]*)\]\(\{\{url\}\}\)/g, "$1");
    return { template: base, url };
}

/**
 * Substitueix {{title}}, {{url}}, {{summary}} i {{summary_executive}} en UNA sola
 * passada i amb una funció de reemplaçament: els valors es copien literals.
 * (Amb strings, `$$`, `$&` o `$1` d'un resum —p. ex. LaTeX— s'interpretaven com a
 * patrons, i un valor que contingués «{{summary}}» es tornava a substituir.)
 */
function fillTemplate(tpl, values) {
    return tpl.replace(/\{\{(title|url|summary_executive|summary)\}\}/g, (_m, key) => values[key]);
}

function formatObsidianContent(template, metadata) {
    const execSummary = extractExecutiveSummary(metadata.summary);
    const { template: tpl, url } = applyUrlToTemplate(template, metadata.url);

    return fillTemplate(tpl, {
        title: metadata.title || "",
        url,
        summary: metadata.summary || "",
        summary_executive: execSummary,
    }).trim();
}

function formatMarkdownContent(template, metadata) {
    const execSummary = extractExecutiveSummary(metadata.summary);
    const { template: tpl, url } = applyUrlToTemplate(template, metadata.url);

    return fillTemplate(tpl, {
        title: metadata.title || "",
        url,
        summary: metadata.summary || "",
        summary_executive: execSummary,
    });
}

// Token Estimation (Simple char count / 4)
/**
 * URL amb fragment de text (`#:~:text=`) perquè el navegador ressalti la cita i hi vagi tot sol.
 * Les cites llargues es donen com «inici,final» (primeres i últimes paraules), com demana l'especificació;
 * `-`, `,` i `&` s'han d'escapar dins del fragment.
 */
function textFragmentUrl(url, quote) {
    const clean = String(quote || "").replace(/[«»“”"]/g, "").replace(/\s+/g, " ").trim().replace(/[.…]+$/, "");
    const enc = (t) => encodeURIComponent(t).replace(/-/g, "%2D");
    const words = clean.split(" ").filter(Boolean);
    const frag = words.length > 8
        ? `${enc(words.slice(0, 4).join(" "))},${enc(words.slice(-4).join(" "))}`
        : enc(words.join(" "));
    let base = url, hash = "";
    const i = url.indexOf("#");
    if (i !== -1) { base = url.slice(0, i); hash = url.slice(i); }
    if (hash.includes(":~:")) hash = hash.slice(0, hash.indexOf(":~:"));
    return `${base}${hash || "#"}:~:text=${frag}`;
}

/** Color CSS d'un tema de Firefox ("#rgb", "#rrggbb", "rgb()/rgba()" o [r,g,b]) → [r,g,b] o null. */
function parseThemeColor(value) {
    if (Array.isArray(value) && value.length >= 3) return value.slice(0, 3).map(Number);
    if (typeof value !== "string") return null;
    const v = value.trim();
    let m = /^#([0-9a-f]{3})$/i.exec(v);
    if (m) return [...m[1]].map(h => parseInt(h + h, 16));
    m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(v);
    if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
    m = /^rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)/i.exec(v);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
    return null;
}

/**
 * Color de fons de la targeta de la barra lateral de Firefox, a partir de `theme.getCurrent().colors`.
 * Retorna una cadena CSS o null (→ es fa servir el color del llenç). `getCurrent` només dona la variant
 * CLARA del tema: si el sistema és fosc i el text de la barra del tema és fosc (tema clar), Firefox
 * fa servir la variant fosca que no veiem, i no ens en fiem.
 */
function firefoxCardColor(colors, systemDark) {
    const bg = parseThemeColor(colors && colors.sidebar);
    if (!bg) return null;
    if (systemDark) {
        const text = parseThemeColor(colors.sidebar_text);
        if (text && (0.2126 * text[0] + 0.7152 * text[1] + 0.0722 * text[2]) < 128) return null;
    }
    return `rgb(${bg.join(",")})`;
}

function estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
}

/**
 * Trunca el text perquè càpiga al context window del model (80 % de marge),
 * reafegint el tancament del bloc UNTRUSTED si el tall el deixa obert.
 * @param {string} text
 * @param {string} modelId
 * @param {Function} [onTruncated] - Es crida si s'ha hagut de truncar
 * @returns {string}
 */
function truncateTextForModel(text, modelId, onTruncated) {
    const models = (typeof CURATED_MODELS !== "undefined" && Array.isArray(CURATED_MODELS))
        ? CURATED_MODELS : [];
    const modelEntry = models.find(m => m.id === modelId);
    const safeLimit = Math.floor(((modelEntry && modelEntry.contextWindow) || 200_000) * 0.8);
    if (estimateTokens(text) > safeLimit) {
        if (onTruncated) onTruncated();
        const charLimit = safeLimit * 4;
        return text.substring(0, charLimit) + "\n\n[... Text truncated due to model limits ...]\n</UNTRUSTED_CONTENT>";
    }
    return text;
}

// Export for Node.js testing environment if needed, otherwise global in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getISOWeekDate,
        isoWeekFromYMD,
        formatObsidianPath,
        parseObsidianPath,
        formatObsidianContent,
        formatMarkdownContent,
        getSourceHttpUrl,
        extractExecutiveSummary,
        estimateTokens,
        truncateTextForModel,
        textFragmentUrl,
        parseThemeColor,
        firefoxCardColor
    };
}
