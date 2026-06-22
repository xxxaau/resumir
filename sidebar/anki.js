/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. */

// sidebar/anki.js
// Plugin Anki: genera targetes Q&A, les mostra en un panell interactiu i les
// exporta a Obsidian amb la sintaxi de obsidian_to_anki.

// Llindar (caràcters combinats q+a) per triar inline vs bloc multi-línia.
const ANKI_INLINE_MAX_LEN = 100;

/**
 * Parseja el text del model i n'extreu les targetes. Defensiu: localitza el
 * primer array JSON encara que el model afegeixi prosa o fences markdown.
 * @returns {Array<{q:string,a:string}>} buit si no parseja.
 */
function parseAnkiCards(rawText) {
    if (!rawText || typeof rawText !== "string") return [];
    const start = rawText.indexOf("[");
    const end = rawText.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) return [];
    let parsed;
    try {
        parsed = JSON.parse(rawText.slice(start, end + 1));
    } catch {
        return [];
    }
    if (!Array.isArray(parsed)) return [];
    return parsed
        .filter(c => c && typeof c.q === "string" && typeof c.a === "string"
            && c.q.trim().length > 0 && c.a.trim().length > 0)
        .map(c => ({ q: c.q.trim(), a: c.a.trim() }));
}

/**
 * Formata una targeta a la sintaxi obsidian_to_anki, triant inline o
 * multi-línia segons la longitud i si hi ha salts de línia.
 */
function formatCardForAnki(card) {
    const q = (card.q || "").trim();
    const a = (card.a || "").trim();
    const hasNewline = q.includes("\n") || a.includes("\n");
    const isShort = (q.length + a.length) < ANKI_INLINE_MAX_LEN;
    if (isShort && !hasNewline) {
        return `STARTI [Basic] ${q} Back: ${a} ENDI`;
    }
    return `START\nBasic\n${q}\nBack: \n${a}\nEND`;
}

/**
 * Construeix el text complet a afegir a Obsidian: un bloc per targeta,
 * separats per una línia en blanc.
 */
function buildAnkiExport(cards) {
    return (cards || [])
        .filter(c => c && c.q && c.a)
        .map(formatCardForAnki)
        .join("\n\n");
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseAnkiCards, formatCardForAnki, buildAnkiExport, ANKI_INLINE_MAX_LEN };
}
