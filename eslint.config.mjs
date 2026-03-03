import js from "@eslint/js";
import globals from "globals";

/** Globals compartides entre els fitxers JS de l'extensió (carregats via <script> al navegador) */
const extensionGlobals = {
    // APIs de WebExtensions (Firefox: browser.*, Chromium: chrome.*)
    browser: "readonly",
    chrome: "readonly",
    // ext.js (wrapper unificat cross-browser)
    ext: "readonly",
    // Readability.js (Mozilla, carregat com a script global via manifest)
    Readability: "readonly",
    // sidebar/utils.js
    getISOWeekDate: "readonly",
    formatObsidianPath: "readonly",
    parseObsidianPath: "readonly",
    formatObsidianContent: "readonly",
    formatMarkdownContent: "readonly",
    estimateTokens: "readonly",
    // shared/models.js
    CURATED_MODELS: "readonly",
    getCuratedModelInfo: "readonly",
    callGeminiStream: "readonly",
    loadModels: "readonly",
    // sidebar/summary.js
    startSummary: "readonly",
    classifyError: "readonly",
    handleTrigger: "readonly",
    // sidebar/ui.js
    setGeneratingState: "readonly",
    applyExtensionVisibility: "readonly",
    applyExtensionOrder: "readonly",
    resetUI: "readonly",
    renderApiKeyWarning: "readonly",
    runCountdownTimer: "readonly",
    startGenerationTimer: "readonly",
    stopGenerationTimer: "readonly",
    startCountdown: "readonly",
    getIcon: "readonly",
    CHECK_ICON_STR: "readonly",
    PLAY_ICON_STR: "readonly",
    PAUSE_ICON_STR: "readonly",
    formatTextToFragment: "readonly",
    updateWaterStats: "readonly",
    WATER_ML_PER_QUERY: "readonly",
    WATER_ML_PER_GLASS: "readonly",
    // sidebar/cache.js
    getSummaryCache: "readonly",
    saveSummaryCache: "readonly",
    saveUsageStats: "readonly",
    // sidebar/stats.js
    getTodayRequestCount: "readonly",
    getTotalTodayCount: "readonly",
    refreshRemainingOnModelChange: "readonly",
    // sidebar/content.js
    getPageContent: "readonly",
};

export default [
    js.configs.recommended,
    {
        // Fitxers a ignorar
        ignores: [
            "Readability.js",         // Llibreria de tercers (Mozilla)
            "background.bundle.js",   // Generat automàticament pel build
            "build_*/",
            "node_modules/",
        ],
    },
    {
        // Fitxers de l'extensió (sidebar/, options/, shared/, arrel)
        files: ["sidebar/**/*.js", "options/**/*.js", "shared/**/*.js", "*.js"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                ...globals.browser,
                ...extensionGlobals,
                // Globals de Node.js per als fitxers amb module.exports condicional
                module: "writable",
            },
        },
        rules: {
            // Conformitat AMO: eval prohibit
            "no-eval": "error",
            // Cap console.log en producció (console.error i console.warn permesos)
            "no-console": ["warn", { allow: ["error", "warn"] }],
            // Variables no usades (warn: moltes funcions s'usen cross-file via globals)
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
            // Redeclarar variables és un error
            "no-redeclare": "error",
            // Permetre catch buits: catch {} és un patró vàlid en extensions per a errors silenciosos
            "no-empty": ["error", { allowEmptyCatch: true }],
        },
    },
    {
        // Fitxers de test: regles més relaxades
        files: ["tests/**/*.mjs", "tests/**/*.test.js"],
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-console": "off",
        },
    },
];
