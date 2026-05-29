const CACHE_TTL_DAYS = 30;
const SUMMARY_CACHE_INDEX_KEY = "summary_cache_index";

function getCacheKey(url, type) {
    return `summary_cache:${url}:${type}`;
}

function _keyToUrl(key) {
    const prefix = "summary_cache:";
    if (!key.startsWith(prefix)) return null;
    const rest = key.slice(prefix.length);
    for (const ct of CONTENT_TYPES) {
        const suffix = `:${ct.id}`;
        if (rest.endsWith(suffix)) {
            return rest.slice(0, -suffix.length);
        }
    }
    return rest;
}

function _keyToType(key) {
    const prefix = "summary_cache:";
    if (!key.startsWith(prefix)) return null;
    const rest = key.slice(prefix.length);
    for (const ct of CONTENT_TYPES) {
        if (rest.endsWith(`:${ct.id}`)) {
            return ct.id;
        }
    }
    return "summary";
}

async function getSummaryCacheIndex() {
    const data = await ext.storage.local.get({ [SUMMARY_CACHE_INDEX_KEY]: [] });
    if (Array.isArray(data[SUMMARY_CACHE_INDEX_KEY])) {
        return data[SUMMARY_CACHE_INDEX_KEY];
    }
    try {
        const allData = await ext.storage.local.get(null);
        return Object.keys(allData).filter(key => key.startsWith("summary_cache:"));
    } catch (fallbackError) {
        console.warn("Cache index missing and full storage enumeration failed:", fallbackError);
        return [];
    }
}

async function getSummaryCache(url, type) {
    if (!url || typeof url !== 'string') return null;
    if (!type) type = "summary";
    try {
        const cacheKey = getCacheKey(url, type);
        const cachedData = await ext.storage.local.get(cacheKey);
        let entry = cachedData[cacheKey];

        if (!entry && type === "summary") {
            const legacyKey = `summary_cache:${url}`;
            const legacyData = await ext.storage.local.get(legacyKey);
            entry = legacyData[legacyKey];
            if (entry) entry._legacy = true;
        }

        if (!entry) return null;
        if (!entry.summary || typeof entry.summary !== 'string') return null;
        if (!entry.timestamp) return null;
        const ageMs = Date.now() - new Date(entry.timestamp).getTime();
        if (ageMs > CACHE_TTL_DAYS * 24 * 60 * 60 * 1000) return null;
        if (!entry.type) entry.type = "summary";
        return entry;
    } catch (e) {
        console.error("Cache check failed:", e);
        return null;
    }
}

async function saveSummaryCache(url, title, summary, modelName, inputTokens, outputTokens, type) {
    if (!type) type = "summary";
    try {
        const cacheKey = getCacheKey(url, type);
        const cacheEntry = {
            url: url,
            title: title,
            summary: summary,
            model: modelName,
            timestamp: new Date().toISOString(),
            version: "1.0",
            stats: { input: inputTokens, output: outputTokens },
            type: type,
        };

        const cacheIndex = await getSummaryCacheIndex();
        if (!cacheIndex.includes(cacheKey)) {
            cacheIndex.push(cacheKey);
        }

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
            const type = value.type || _keyToType(key) || "summary";
            entries.push({
                url: value.url,
                title: value.title,
                model: value.model,
                timestamp: value.timestamp,
                summary: value.summary,
                type: type,
            });
        }
        entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        return entries;
    } catch (e) {
        console.error("Error listing cached summaries:", e);
        return [];
    }
}

async function getAvailableTypes(url) {
    if (!url) return [];
    try {
        const cacheIndex = await getSummaryCacheIndex();
        const relevant = cacheIndex.filter(key => _keyToUrl(key) === url);
        if (relevant.length === 0) {
            const legacyKey = `summary_cache:${url}`;
            const legacyData = await ext.storage.local.get(legacyKey);
            if (legacyData[legacyKey]?.timestamp && legacyData[legacyKey]?.summary) {
                return ["summary"];
            }
            return [];
        }
        const allData = await ext.storage.local.get(relevant);
        const cutoff = Date.now() - CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
        const types = [];
        for (const key of relevant) {
            const value = allData[key];
            if (!value?.timestamp) continue;
            const ts = new Date(value.timestamp).getTime();
            if (ts < cutoff) continue;
            types.push(_keyToType(key));
        }
        return types;
    } catch (e) {
        console.error("Error getting available types:", e);
        return [];
    }
}

async function deleteSummaryCache(url, type) {
    if (!type) type = "summary";
    try {
        const cacheKey = getCacheKey(url, type);
        const cacheIndex = await getSummaryCacheIndex();
        const newIndex = cacheIndex.filter(k => k !== cacheKey);
        if (newIndex.length === cacheIndex.length) return false;
        await ext.storage.local.remove(cacheKey);
        await ext.storage.local.set({ [SUMMARY_CACHE_INDEX_KEY]: newIndex });
        return true;
    } catch (e) {
        console.error("Error deleting cache entry:", e);
        return false;
    }
}

async function saveUsageStats(inputTokens, outputTokens, contentType, modelName, latency, title, url, cacheTokens) {
    if (!contentType) contentType = "summary";
    if (cacheTokens === undefined) cacheTokens = 0;
    try {
        const data = await ext.storage.local.get(["stats", "usageHistory", "dailyStats"]);
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
            type: contentType,
            latency: latency
        };

        const history = data.usageHistory || [];
        history.unshift(historyEntry);

        if (history.length > 1000) history.pop();

        const todayKey = new Date().toISOString().slice(0, 10);
        const dailyStats = data.dailyStats || {};
        dailyStats[todayKey] = (dailyStats[todayKey] || 0) + 1;

        await ext.storage.local.set({ stats: newStats, usageHistory: history, dailyStats });
        return newStats;
    } catch (e) {
        console.error("Error saving statistics:", e);
        return null;
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getSummaryCache, saveSummaryCache, saveUsageStats, purgeStaleCacheEntries, listCachedSummaries, getAvailableTypes, deleteSummaryCache, getCacheKey };
}
