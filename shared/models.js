// shared/models.js
// Font única de veritat per a la llista de models curats.
// Carregat via <script> en sidebar.html i options/settings.html.
// Importat via require() en els tests Node.

/** Taxa de conversió USD → EUR. Font: referència editorial, actualitzar cada any. */
const EUR_RATE = 0.92; // 2026-Q1 (font: ECB)

const CURATED_MODELS = [
    { id: "gemini-3-flash-preview",    label: "Gemini 3 Flash",       priceIn: 0.50, priceOut: 3.00,  rpd: 500,    contextWindow: 1_048_576, fallback: true  },
    { id: "gemini-2.5-pro",            label: "Gemini 2.5 Pro",       priceIn: 1.25, priceOut: 5.00,  rpd: 50,     contextWindow: 1_000_000, fallback: false },
    { id: "gemini-2.5-flash",          label: "Gemini 2.5 Flash",     priceIn: 0.30, priceOut: 2.50,  rpd: 500,    contextWindow: 1_000_000, fallback: true  },
    { id: "gemini-2.0-flash",          label: "Gemini 2.0 Flash",     priceIn: 0.10, priceOut: 0.40,  rpd: 1500,   contextWindow: 1_000_000, fallback: true  }, // deprecat 01/06/2026
    { id: "gemini-2.0-flash-lite",     label: "Gemini 2.0 Flash Lite",priceIn: 0.07, priceOut: 0.30,  rpd: 999999, contextWindow: 1_000_000, fallback: true  }, // deprecat 01/06/2026
    { id: "gemma-3-27b-it",            label: "Gemma 3 (27B)",        priceIn: 0.15, priceOut: 0.15,  rpd: 2000,   contextWindow: 131_072,   fallback: true  },
];

/** Model usat per defecte si l'usuari no n'ha triat cap. */
const DEFAULT_MODEL_ID = "gemini-3-flash-preview";

/**
 * Assegura que favoriteModels existeix a storage.sync.
 * Si no existeix (primer ús), l'inicialitza amb els models curats.
 * Si ja existeix, assegura que sempre inclou el model per defecte (Gemini 3 Flash).
 * Retorna l'array de IDs favorits.
 */
async function ensureFavoriteModels() {
    const data = await ext.storage.sync.get({ favoriteModels: null });
    let favorites = data.favoriteModels;
    
    // Primer ús: inicialitzar amb tots els models curats
    if (!favorites) {
        favorites = CURATED_MODELS.map(m => m.id);
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
    module.exports = { CURATED_MODELS, DEFAULT_MODEL_ID, EUR_RATE };
}
