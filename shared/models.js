// shared/models.js
// Font única de veritat per a la llista de models curats.
// Carregat via <script> en sidebar.html i options/settings.html.
// Importat via require() en els tests Node.

/** Taxa de conversió USD → EUR. Font: referència editorial, actualitzar cada any. */
const EUR_RATE = 0.92; // 2025-Q1

const CURATED_MODELS = [
    { id: "gemini-2.5-pro",            label: "Gemini 2.5 Pro",       priceIn: 1.25, priceOut: 5.00,  rpd: 50,     contextWindow: 1_000_000, fallback: false },
    { id: "gemini-2.0-flash",          label: "Gemini 2.0 Flash",     priceIn: 0.10, priceOut: 0.40,  rpd: 1500,   contextWindow: 1_000_000, fallback: true  },
    { id: "gemini-2.5-flash",          label: "Gemini 2.5 Flash",     priceIn: 0.30, priceOut: 2.50,  rpd: 500,    contextWindow: 1_000_000, fallback: true  },
    { id: "gemma-3-27b-it",            label: "Gemma 3 (27B)",        priceIn: 0.15, priceOut: 0.15,  rpd: 2000,   contextWindow: 131_072,   fallback: true  },
    { id: "gemini-2.0-flash-lite",     label: "Gemini 2.0 Flash Lite",priceIn: 0.07, priceOut: 0.30,  rpd: 999999, contextWindow: 1_000_000, fallback: true  },
];

/** Model usat per defecte si l'usuari no n'ha triat cap. */
const DEFAULT_MODEL_ID = "gemini-2.0-flash";

/**
 * Assegura que favoriteModels existeix a storage.sync.
 * Si no existeix (primer ús), l'inicialitza amb els models curats.
 * Retorna l'array de IDs favorits.
 */
async function ensureFavoriteModels() {
    const data = await ext.storage.sync.get({ favoriteModels: null });
    if (data.favoriteModels) return data.favoriteModels;
    const defaults = CURATED_MODELS.map(m => m.id);
    await ext.storage.sync.set({ favoriteModels: defaults });
    return defaults;
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURATED_MODELS, DEFAULT_MODEL_ID, EUR_RATE };
}
