// shared/models.js
// Font única de veritat per a la llista de models curats.
// Carregat via <script> en sidebar.html i options/settings.html.
// Importat via require() en els tests Node.

const CURATED_MODELS = [
    { id: "gemini-2.5-pro",            label: "Gemini 2.5 Pro",       priceIn: 1.25, priceOut: 5.00,  rpd: 50     },
    { id: "gemini-2.0-flash",          label: "Gemini 2.0 Flash",     priceIn: 0.10, priceOut: 0.40,  rpd: 1500   },
    { id: "gemini-2.5-flash",          label: "Gemini 2.5 Flash",     priceIn: 0.30, priceOut: 2.50,  rpd: 500    },
    { id: "gemma-3-27b-it",            label: "Gemma 3 (27B)",        priceIn: 0.15, priceOut: 0.15,  rpd: 2000   },
    { id: "gemini-2.0-flash-lite",     label: "Gemini 2.0 Flash Lite",priceIn: 0.07, priceOut: 0.30,  rpd: 999999 },
];

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { CURATED_MODELS };
}
