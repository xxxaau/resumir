/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-backup.js
// Exportar i importar la configuració (JSON). La importació és una frontera de confiança:
// només s'accepten claus conegudes, amb el tipus esperat i una mida que càpiga a storage.sync.

const BACKUP_FORMAT_VERSION = 1;
const BACKUP_ITEM_MAX_BYTES = 8000;     // storage.sync: 8192 bytes per element

// clau → validador (estat intern com els avisos *UpdateAvailable NO s'exporta)
const _isStr = (v) => typeof v === "string";
const _isBool = (v) => typeof v === "boolean";
const _isNum = (v) => typeof v === "number" && Number.isFinite(v);
const _isStrList = (v) => Array.isArray(v) && v.length <= 60 && v.every(x => typeof x === "string" && x.length <= 80);
const _oneOf = (list) => (v) => typeof v === "string" && list.includes(v);

const CONFIG_VALIDATORS = {
    modelName: _isStr, theme: _oneOf(["system", "flexoki", "light", "dark", "solarized", "soft-gray"]),
    systemPrompt: _isStr, summaryFormat: _oneOf(["default", "bullets", "tldr", "prose"]),
    summaryLength: _oneOf(["short", "medium", "long"]), youtubePreferredLangs: _isStrList,
    enableMarkdown: _isBool, markdownTemplate: _isStr,
    enableObsidian: _isBool, obsidianVault: _isStr, obsidianPath: _isStr, obsidianTemplate: _isStr,
    enableBionic: _isBool, bionicFixation: _isNum, bionicFont: _isStr, bionicWeight: _isStr, bionicFontSize: _isStr, bionicLineHeight: _isStr,
    enableDeepdive: _isBool, deepDivePrompt: _isStr,
    enableScience: _isBool, sciencePrompt: _isStr,
    enableResum: _isBool, enablePdf: _isBool,
    enableConceptMap: _isBool, conceptMapPrompt: _isStr, conceptMapDepth: _isNum, conceptMapBranches: _isNum,
    conceptMapShowDescriptions: _isBool, conceptMapAutoExpand: _isBool,
    enableSimple: _isBool, simplePrompt: _isStr,
    enableAnki: _isBool, ankiVault: _isStr, ankiPath: _isStr, ankiPacket: _isNum, ankiLang: _oneOf(["ca", "en"]), ankiPrompt: _isStr,
    systemPromptCustomized: _isBool, deepDivePromptCustomized: _isBool, sciencePromptCustomized: _isBool,
    conceptMapPromptCustomized: _isBool, simplePromptCustomized: _isBool, ankiPromptCustomized: _isBool,
    extensionOrder: _isStrList, favoriteModels: _isStrList,
    promptVersions: (v) => v && typeof v === "object" && !Array.isArray(v) && Object.values(v).every(_isNum),
};
const CONFIG_EXPORT_KEYS = Object.keys(CONFIG_VALIDATORS);
const BACKUP_PROMPT_KEYS = ["systemPrompt", "deepDivePrompt", "sciencePrompt", "conceptMapPrompt", "simplePrompt", "ankiPrompt"];

/** Construeix el document a descarregar. La clau d'API només hi va si l'usuari ho demana. */
function buildConfigExport(syncData, localData, { includeKey = false, version = "", now = new Date() } = {}) {
    const settings = {};
    for (const k of CONFIG_EXPORT_KEYS) {
        if (syncData && syncData[k] !== undefined) settings[k] = syncData[k];
    }
    const out = {
        app: "resumir", formatVersion: BACKUP_FORMAT_VERSION, extensionVersion: version,
        exportedAt: now.toISOString(), settings,
    };
    if (includeKey && localData && localData.apiKey) out.apiKey = localData.apiKey;
    return out;
}

/** Valida un fitxer d'importació. Retorna { ok, settings, apiKey, ignored, customPrompts } o { ok:false, error }. */
function parseConfigImport(text) {
    let data;
    try { data = JSON.parse(text); } catch { return { ok: false, error: "El fitxer no és un JSON vàlid." }; }
    if (!data || typeof data !== "object" || data.app !== "resumir") {
        return { ok: false, error: "Aquest fitxer no és una còpia de configuració de Resumir." };
    }
    if (typeof data.formatVersion === "number" && data.formatVersion > BACKUP_FORMAT_VERSION) {
        return { ok: false, error: "El fitxer és d'una versió més nova de Resumir: actualitza l'extensió abans d'importar-lo." };
    }
    if (!data.settings || typeof data.settings !== "object" || Array.isArray(data.settings)) {
        return { ok: false, error: "El fitxer no conté cap bloc d'ajustos." };
    }
    const settings = {}, ignored = [];
    for (const [k, v] of Object.entries(data.settings)) {
        const valid = Object.prototype.hasOwnProperty.call(CONFIG_VALIDATORS, k) && CONFIG_VALIDATORS[k](v);
        const size = valid ? new TextEncoder().encode(JSON.stringify(v)).length : 0;
        if (valid && size <= BACKUP_ITEM_MAX_BYTES) settings[k] = v; else ignored.push(k);
    }
    const out = { ok: true, settings, ignored, customPrompts: BACKUP_PROMPT_KEYS.filter(k => typeof settings[k] === "string" && settings[k].trim()) };
    if (data.apiKey !== undefined) {
        const key = typeof normalizeApiKey === "function" ? normalizeApiKey(data.apiKey) : String(data.apiKey).trim();
        if (typeof data.apiKey === "string" && /^AIza[\w-]{20,}$/.test(key)) out.apiKey = key; else ignored.push("apiKey");
    }
    return out;
}

function _backupDateStamp(d = new Date()) {
    return d.toISOString().slice(0, 10).replace(/-/g, "");
}

async function exportConfig() {
    const includeKey = !!(document.getElementById("exportIncludeKey") || {}).checked;
    const [syncData, localData] = await Promise.all([ext.storage.sync.get(null), ext.storage.local.get(["apiKey"])]);
    const version = (ext.runtime.getManifest && ext.runtime.getManifest().version) || "";
    const doc = buildConfigExport(syncData, localData, { includeKey, version });
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `resumir-configuracio-${_backupDateStamp()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
    showStatus(includeKey ? "Configuració exportada, amb la clau d'API: guarda el fitxer amb cura." : "Configuració exportada (sense la clau d'API).");
}

async function importConfigFromFile(file) {
    if (!file) return;
    let text;
    try { text = await file.text(); } catch { showStatus("No s'ha pogut llegir el fitxer."); return; }
    const r = parseConfigImport(text);
    if (!r.ok) { showStatus(r.error); return; }
    const n = Object.keys(r.settings).length;
    if (n === 0 && !r.apiKey) { showStatus("El fitxer no conté cap ajust vàlid per importar."); return; }
    const parts = [`${n} ajustos`];
    if (r.customPrompts.length) parts.push(`${r.customPrompts.length} ${r.customPrompts.length === 1 ? "prompt personalitzat" : "prompts personalitzats"}`);
    if (r.apiKey) parts.push("la clau d'API");
    if (!confirm(`S'importaran ${parts.join(", ")}. Substituiran els valors actuals dels mateixos ajustos; la resta es conserva.`)) return;
    try {
        await ext.storage.sync.set(r.settings);
        if (r.apiKey) await ext.storage.local.set({ apiKey: r.apiKey });
        const [syncData, localData] = await Promise.all([ext.storage.sync.get(null), ext.storage.local.get(["apiKey"])]);
        restoreOptions(syncData, localData);
        setDirty(false);
        if (typeof updateSidebar === "function") updateSidebar();
        showStatus(r.ignored.length ? `Configuració importada (s'han ignorat ${r.ignored.length} valors no vàlids).` : "Configuració importada.");
    } catch (e) {
        console.error("Error important la configuració:", e);
        showStatus("No s'ha pogut importar la configuració.");
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildConfigExport, parseConfigImport, CONFIG_EXPORT_KEYS, CONFIG_VALIDATORS };
}
