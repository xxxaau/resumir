// conceptmap-filename.js
// Pure utility for building PNG export filenames for concept maps.
//
// Format: YYYYMMDD_word1_word2.png
//   - YYYYMMDD from local date
//   - 1 or 2 significant words from the map's root label
//   - lowercase, ASCII only (NFD strip diacritics), stop-words removed
//   - fallback "_mapa" if no significant words remain
//   - each word truncated to 20 chars
//
// Shared between sidebar (classic <script> tag) and tests (ESM import).

(function () {
    "use strict";

    const STOP_WORDS = new Set([
        // ca
        "a","al","als","amb","de","del","dels","el","els","en","es","i","la","les","lo",
        "o","per","que","un","una","uns","unes","com","si",
        // es
        "con","las","los","por","y",
        // en
        "an","and","at","by","for","in","of","on","or","the","to","with","is","it","as",
    ]);

    /**
     * Build a PNG filename from a concept map's root label.
     * Pure: only depends on rootLabel + current local date.
     *
     * @param {string} rootLabel - The label of the parsed mind-map root node.
     * @param {Date}   [now]     - Optional date for deterministic testing.
     * @returns {string} Filename like "20260522_mapes_conceptuals.png"
     */
    function buildConceptMapFilename(rootLabel, now) {
        const d = now instanceof Date ? now : new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const date = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

        const normalised = String(rootLabel || "")
            .normalize("NFD")
            // strip combining diacritic marks (à -> a, ç -> c, etc.)
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            // everything that is not ascii alphanumeric becomes a separator
            .replace(/[^a-z0-9]+/g, " ")
            .trim();

        const tokens = normalised.length === 0
            ? []
            : normalised.split(/\s+/)
                // drop stop-words and tokens of 1 char or less
                .filter(t => t.length > 1 && !STOP_WORDS.has(t))
                // truncate each token to 20 chars
                .map(t => t.slice(0, 20));

        const picked = tokens.slice(0, 2);
        if (picked.length === 0) return `${date}_mapa.png`;
        return `${date}_${picked.join("_")}.png`;
    }

    // Browser: expose globally for classic <script> usage
    if (typeof window !== "undefined") {
        window.buildConceptMapFilename = buildConceptMapFilename;
    }
    // Node (tests): support both CommonJS and ESM-via-dynamic-import patterns
    if (typeof module !== "undefined" && module.exports) {
        module.exports = { buildConceptMapFilename };
    }
})();
