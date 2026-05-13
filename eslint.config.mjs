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
    DEFAULT_MODEL_ID: "readonly",
    DEFAULT_MODEL_INFO: "readonly",
    EUR_RATE: "readonly",
    ensureFavoriteModels: "readonly",
    getCuratedModelInfo: "readonly",
    callGeminiStream: "readonly",
    loadModels: "readonly",
    // shared/defaults.js
    DEFAULT_SYSTEM_PROMPT: "readonly",
    DEFAULT_DEEP_DIVE_PROMPT: "readonly",
    DEFAULT_SCIENCE_PROMPT: "readonly",
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
    stopCountdownTimer: "readonly",
    startCountdown: "readonly",
    getIcon: "readonly",
    CHECK_ICON_STR: "readonly",
    PLAY_ICON_STR: "readonly",
    PAUSE_ICON_STR: "readonly",
    formatTextToFragment: "readonly",
    updateTokenStats: "readonly",
    // sidebar/cache.js
    getSummaryCache: "readonly",
    saveSummaryCache: "readonly",
    saveUsageStats: "readonly",
    purgeStaleCacheEntries: "readonly",
    listCachedSummaries: "readonly",
    // sidebar/history.js
    openHistoryPanel: "readonly",
    closeHistoryPanel: "readonly",
    loadHistoryEntry: "readonly",
    openSourcePanel: "readonly",
    closeSourcePanel: "readonly",
    // defuddle.js (injectat com a script en runtime)
    Defuddle: "readonly",
    // sidebar/stats.js
    getDailyStats: "readonly",
    getTodayRequestCount: "readonly",
    getTotalTodayCount: "readonly",
    refreshRemainingOnModelChange: "readonly",
    // sidebar/content.js
    getPageContent: "readonly",
    executeScriptSafe: "readonly",
    // sidebar/youtube-track-select.js
    selectYoutubeTrack: "readonly",
};

/** Globals cross-file específics de la pàgina d'opcions (settings-*.js) */
const settingsGlobals = {
    // settings-defaults.js
    DEFAULT_MARKDOWN_TEMPLATE: "readonly",
    DEFAULT_SYSTEM_PROMPT: "readonly",
    DEFAULT_OBSIDIAN_TEMPLATE: "readonly",
    DEFAULT_DEEP_DIVE_PROMPT: "readonly",
    DEFAULT_SCIENCE_PROMPT: "readonly",
    // settings-order.js
    getCurrentExtensionOrder: "readonly",
    applyExtensionOrder: "readonly",
    moveExtension: "readonly",
    updateMoveButtonsState: "readonly",
    // settings-cache.js
    updateCacheInfo: "readonly",
    clearCache: "readonly",
    // settings-stats.js
    PAGE_SIZE: "writable",
    currentPage: "writable",
    currentPeriod: "writable",
    totalPages: "writable",
    loadStatistics: "readonly",
    getRelativeTime: "readonly",
    renderDailyChart: "readonly",
    renderGroupedHistoryTable: "readonly",
    renderGroupedPage: "readonly",
    renderHistoryTable: "readonly",
    clearHistory: "readonly",
    groupedCurrentPage: "writable",
    groupedTotalPages: "writable",
    // settings-models.js
    modelNote: "readonly",
    listModels: "readonly",
    refreshModels: "readonly",
    // settings-options.js
    saveOptions: "readonly",
    restoreOptions: "readonly",
    initializeSettingsPageUI: "readonly",
    resetTemplate: "readonly",
    resetObsidianTemplate: "readonly",
    resetSystemPrompt: "readonly",
    resetDeepDivePrompt: "readonly",
    resetSciencePrompt: "readonly",
    showStatus: "readonly",
    // settings-sidebar.js
    initializeSidebarNavigation: "readonly",
    navigateToTab: "readonly",
    updateSidebar: "readonly",
};

const crossFilePublicNamesPattern = `^(${[...Object.keys(extensionGlobals), ...Object.keys(settingsGlobals)].join("|")})$`;

export default [
    js.configs.recommended,
    {
        // Fitxers a ignorar
        ignores: [
            "Readability.js",         // Llibreria de tercers (Mozilla)
            "defuddle.js",            // Llibreria de tercers (Defuddle)
            "background.bundle.js",   // Generat automàticament pel build
            "build_*/",
            "node_modules/",
            "scripts/",               // Scripts d'utilitat (no part de l'extensió)
            "coverage/",              // Reports de cobertura generats
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
            // Funcions cross-file: definides en un <script> i usades en un altre (globals)
            "no-unused-vars": ["warn", { varsIgnorePattern: crossFilePublicNamesPattern, argsIgnorePattern: "^_", caughtErrors: "none" }],
            // Permetre catch buits: catch {} és un patró vàlid en extensions
            "no-empty": ["error", { allowEmptyCatch: true }],
        },
    },
    {
        // Globals addicionals per als mòduls de la pàgina d'opcions
        files: ["options/**/*.js"],
        languageOptions: {
            globals: {
                ...settingsGlobals,
            },
        },
        rules: {
            // Conformitat AMO: eval prohibit
            "no-eval": "error",
            // Cap console.log en producció (console.error i console.warn permesos)
            "no-console": ["warn", { allow: ["error", "warn"] }],
            // Variables no usades (warn: moltes funcions s'usen cross-file via globals)
            "no-unused-vars": ["warn", { varsIgnorePattern: crossFilePublicNamesPattern, argsIgnorePattern: "^_" }],
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
                ...globals.browser,
            },
        },
        rules: {
            "no-console": "off",
        },
    },
    {
        // Scripts de construcció i utilitats Node
        files: ["scripts/**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
            globals: {
                ...globals.node,
            },
        },
        rules: {
            "no-console": "off",
            "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        },
    },
];
