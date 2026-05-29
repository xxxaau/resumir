/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// shared/models.js
// Font única de veritat per a la llista de models curats.
// Carregat via <script> en sidebar.html i options/settings.html.
// Importat via require() en els tests Node.

/** Taxa de conversió USD → EUR. Font: referència editorial, actualitzar cada trimestre.
 * Last updated: May 18, 2026 (Q2 2026 rate from ECB)
 */
const EUR_RATE = 0.92; // 2026-Q2

const CURATED_MODELS = [
    // Flash Lite — prioritat màxima (ràpids, econòmics)
    { id: "gemini-3.1-flash-lite",     label: "Gemini 3.1 Flash Lite",    priceIn: 0.25,   priceOut: 1.50,   rpd: 2000,   contextWindow: 1_000_000, fallback: true  },
    
    // Flash — equilibri velocitat/cost
    { id: "gemini-3.5-flash",          label: "Gemini 3.5 Flash",         priceIn: 0.30,   priceOut: 2.50,   rpd: 1500,   contextWindow: 1_000_000, fallback: true  },
    { id: "gemini-2.5-flash",          label: "Gemini 2.5 Flash",         priceIn: 0.30,   priceOut: 2.50,   rpd: 500,    contextWindow: 1_000_000, fallback: true  },
    
    // Gemma — open source, gratis, bon valor per resumir
    { id: "gemma-3-27b-it",            label: "Gemma 3 (27B)",            priceIn: 0.15,   priceOut: 0.15,   rpd: 2000,   contextWindow: 131_072,   fallback: true  },
    { id: "gemma-3-12b-it",            label: "Gemma 3 (12B)",            priceIn: 0.10,   priceOut: 0.10,   rpd: 2000,   contextWindow: 131_072,   fallback: true  },
    
    // Flash Preview — per sobre de Pro (preu Flash, qualitat propera a Pro)
    { id: "gemini-3-flash-preview",    label: "Gemini 3 Flash",           priceIn: 0.50,   priceOut: 3.00,   rpd: 1000,   contextWindow: 1_048_576, fallback: true  },
    
    // Pro — màxima potència
    { id: "gemini-2.5-pro",            label: "Gemini 2.5 Pro",           priceIn: 1.25,   priceOut: 5.00,   rpd: 50,     contextWindow: 1_000_000, fallback: false },
    
    // Pro Preview — última generació Pro
    { id: "gemini-3.1-pro-preview",    label: "Gemini 3.1 Pro",           priceIn: 2.00,   priceOut: 12.00,  rpd: 100,    contextWindow: 1_048_576, fallback: false },
];

/**
 * Model usat per defecte si l'usuari no n'ha triat cap.
 * PRIORITAT: Lite models per a millor UX en primera càrrega (ràpid + económic)
 * Gemini 3.1 Flash Lite és el més nou i ràpid disponible.
 */
const DEFAULT_MODEL_ID = "gemini-3.1-flash-lite";

/**
 * Pricing/quota fallback when a model is not in CURATED_MODELS.
 * Conservative defaults aligned with Gemini Flash tier.
 * Prices are in USD per 1M tokens; multiply by EUR_RATE for EUR.
 */
const DEFAULT_MODEL_INFO = {
    priceIn: 0.10,
    priceOut: 0.40,
    rpd: 1500,
    contextWindow: 1_000_000,
};

/**
 * Ordena un array de models per prioritat:
 *   1. Flash Lite (no preview)
 *   2. Flash (no preview)
 *   3. Gemma
 *   4. Flash Preview (flash + preview — sobre Pro)
 *   5. Pro (no preview)
 *   6. Pro Preview (pro + preview)
 *   7. Altres (image, specialized, etc.)
 * Dins cada grup, versions més recents primer.
 * @param {Array<{id:string}>|string[]} models
 * @returns {Array} nova array ordenada
 */
function sortModelsByPriority(models) {
    function key(m) {
        const obj = typeof m === "string" ? null : m;
        const id = (obj ? obj.id : m) || "";
        const lower = id.toLowerCase();
        const isPreview = lower.includes("preview");
        let group;
        if (!isPreview) {
            if (lower.includes("flash-lite")) group = 1;
            else if (lower.includes("flash")) group = 2;
            else if (lower.includes("gemma")) group = 3;
            else if (lower.includes("pro")) group = 5;
            else group = 7;
        } else {
            if (lower.includes("flash")) group = 4;
            else if (lower.includes("pro")) group = 6;
            else group = 7;
        }
        const v = lower.match(/(\d+)[._]?(\d+)?/) || [];
        const major = parseInt(v[1]) || 0;
        const minor = parseInt(v[2]) || 0;
        const revMajor = String(999 - major).padStart(3, "0");
        const revMinor = String(999 - minor).padStart(3, "0");
        return `${group}:${revMajor}:${revMinor}`;
    }
    return [...models].sort((a, b) => {
        const ka = key(a);
        const kb = key(b);
        return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
}

/**
 * Assegura que favoriteModels existeix a storage.sync.
 * Si no existeix (primer ús), l'inicialitza amb els models curats.
 * Si ja existeix, assegura que sempre inclou el model per defecte (Gemini 3 Flash).
 * Retorna l'array de IDs favorits.
 */
async function ensureFavoriteModels() {
    const data = await ext.storage.sync.get({ favoriteModels: null });
    let favorites = data.favoriteModels;
    
    // Primer ús: inicialitzar amb el model per defecte
    if (!favorites) {
        favorites = [DEFAULT_MODEL_ID];
        await ext.storage.sync.set({ favoriteModels: favorites });
        return favorites;
    }
    
    // Migració: assegurar que sempre inclou el model per defecte
    if (!favorites.includes(DEFAULT_MODEL_ID)) {
        favorites = [DEFAULT_MODEL_ID, ...favorites];
        await ext.storage.sync.set({ favoriteModels: favorites });
    }
    
    return favorites;
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURATED_MODELS, DEFAULT_MODEL_ID, DEFAULT_MODEL_INFO, EUR_RATE, sortModelsByPriority };
}
