// sidebar/cache.js
// Handles local storage operations for summaries, sessions, and statistics

const CACHE_TTL_DAYS = 30;
const SUMMARY_CACHE_INDEX_KEY = "summary_cache_index";

function getSummaryCacheKey(url) {
    return `summary_cache:${url}`;
}

async function getSummaryCacheIndex() {
    const data = await ext.storage.local.get({ [SUMMARY_CACHE_INDEX_KEY]: [] });
    if (Array.isArray(data[SUMMARY_CACHE_INDEX_KEY])) {
        return data[SUMMARY_CACHE_INDEX_KEY];
    }

    // Fallback to enumerating existing cache keys if the index is missing.
    // This is a safe fallback for older storage states and unit tests.
    try {
        const allData = await ext.storage.local.get(null);
        return Object.keys(allData).filter(key => key.startsWith("summary_cache:"));
    } catch (fallbackError) {
        console.warn("Cache index missing and full storage enumeration failed:", fallbackError);
        return [];
    }
}

/**
 * Checks local storage for a cached summary of the given URL.
 */
async function getSummaryCache(url) {
    if (!url || typeof url !== 'string') return null;
    try {
        const cacheKey = `summary_cache:${url}`;
        const cachedData = await ext.storage.local.get(cacheKey);
        const entry = cachedData[cacheKey];
        if (!entry) return null;
        if (!entry.summary || typeof entry.summary !== 'string') return null;
        // Verificar TTL — entrades sense timestamp es consideren expirades (igual que purgeStaleCacheEntries)
        if (!entry.timestamp) return null;
        const ageMs = Date.now() - new Date(entry.timestamp).getTime();
        if (ageMs > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) return null;
        return entry;
    } catch (e) {
        console.error("Cache check failed:", e);
        return null;
    }
}

/**
 * Saves a generated summary to local storage cache.
 */
async function saveSummaryCache(url, title, summary, modelName, inputTokens, outputTokens) {
    try {
        const cacheKey = getSummaryCacheKey(url);
        const cacheEntry = {
            url: url,
            title: title,
            summary: summary,
            model: modelName,
            timestamp: new Date().toISOString(),
            version: "1.0",
            stats: { input: inputTokens, output: outputTokens }
        };

        const cacheIndex = await getSummaryCacheIndex();
        if (!cacheIndex.includes(cacheKey)) {
            cacheIndex.push(cacheKey);
        }

        // Cap index to 500 entries — remove oldest entries if over limit
        const MAX_CACHE_ENTRIES = 500;
        if (cacheIndex.length > MAX_CACHE_ENTRIES) {
            const toRemove = cacheIndex.splice(0, cacheIndex.length - MAX_CACHE_ENTRIES);
            await ext.storage.local.remove(toRemove);
        }

        await ext.storage.local.set({
            [cacheKey]: cacheEntry,
            [SUMMARY_CACHE_INDEX_KEY]: cacheIndex
        });
        return true;
    } catch (e) {
        console.error("Error saving to cache:", e);
        return false;
    }
}

/**
 * Elimina les entrades de caché més velles que CACHE_TTL_DAYS.
 * Usa storage.local.get(null) per enumerar totes les claus.
 * @returns {number} Nombre d'entrades eliminades.
 */
async function purgeStaleCacheEntries() {
    try {
        const cacheIndex = await getSummaryCacheIndex();
        if (cacheIndex.length === 0) return 0;

        const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
        const allData = await ext.storage.local.get(cacheIndex);
        const keysToRemove = [];

        for (const key of cacheIndex) {
            const value = allData[key];
            const ts = value?.timestamp ? new Date(value.timestamp).getTime() : 0;
            if (ts < cutoff || !value) {
                keysToRemove.push(key);
            }
        }

        if (keysToRemove.length > 0) {
            const newIndex = cacheIndex.filter(key => !keysToRemove.includes(key));
            await ext.storage.local.remove(keysToRemove);
            await ext.storage.local.set({ [SUMMARY_CACHE_INDEX_KEY]: newIndex });
        }
        return keysToRemove.length;
    } catch (e) {
        console.error("Error purging stale cache:", e);
        return 0;
    }
}

/**
 * Retorna totes les entrades de caché vàlides (amb timestamp i dins TTL),
 * ordenades per data descendent (més recent primer).
 * @returns {Array<{url, title, model, timestamp, summary}>}
 */
async function listCachedSummaries() {
    try {
        const cacheIndex = await getSummaryCacheIndex();
        if (cacheIndex.length === 0) return [];

        const allData = await ext.storage.local.get(cacheIndex);
        const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
        const entries = [];

        for (const key of cacheIndex) {
            const value = allData[key];
            if (!value?.timestamp) continue;
            const ts = new Date(value.timestamp).getTime();
            if (ts < cutoff) continue;
            entries.push({
                url: value.url,
                title: value.title,
                model: value.model,
                timestamp: value.timestamp,
                summary: value.summary,
            });
        }
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return entries;
    } catch (e) {
        console.error("Error listing cached summaries:", e);
        return [];
    }
}

/**
 * Saves usage statistics and history for a generated summary.
 */
async function saveUsageStats(inputTokens, outputTokens, isDeepDive, modelName, latency, title, url, cacheTokens = 0) {
    try {
        // Read stats and history in a single call
        const data = await ext.storage.local.get(["stats", "usageHistory"]);
        const currentStats = data.stats || { articles: 0, tokens: 0 };

        const newStats = {
            articles: currentStats.articles + 1,
            tokens: Math.round(currentStats.tokens + inputTokens + outputTokens)
        };

        const historyEntry = {
            date: new Date().toISOString(),
            title: title || "No Title",
            url: url || "No URL",
            model: modelName,
            inputTokens: Math.round(inputTokens),
            outputTokens: Math.round(outputTokens),
            cacheTokens: Math.round(cacheTokens),
            type: (isDeepDive || modelName.includes("pro")) ? "deep" : "lite",
            latency: latency
        };

        const history = data.usageHistory || [];
        history.unshift(historyEntry);

        // Keep last 100 entries
        if (history.length > 100) history.pop();

        await ext.storage.local.set({ stats: newStats, usageHistory: history });
        return newStats;
    } catch (e) {
        console.error("Error saving statistics:", e);
        return null;
    }
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries, listCachedSummaries };
}
