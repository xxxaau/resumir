// sidebar/cache.js
// Handles local storage operations for summaries, sessions, and statistics

/**
 * Checks local storage for a cached summary of the given URL.
 */
async function getSummaryCache(url) {
    try {
        const cacheKey = `summary_cache:${url}`;
        const cachedData = await ext.storage.local.get(cacheKey);
        return cachedData[cacheKey] || null;
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
        const cacheKey = `summary_cache:${url}`;
        const cacheEntry = {
            url: url,
            title: title,
            summary: summary,
            model: modelName,
            timestamp: new Date().toISOString(),
            version: "1.0",
            stats: { input: inputTokens, output: outputTokens }
        };
        await ext.storage.local.set({ [cacheKey]: cacheEntry });
        return true;
    } catch (e) {
        console.error("Error saving to cache:", e);
        return false;
    }
}

/**
 * Saves usage statistics and history for a generated summary.
 */
async function saveUsageStats(inputTokens, outputTokens, isDeepDive, modelName, latency, title, url) {
    try {
        const stats = await ext.storage.local.get("stats");
        const currentStats = stats.stats || { articles: 0, tokens: 0 };
        
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
            type: (isDeepDive || modelName.includes("pro")) ? "deep" : "lite",
            latency: latency
        };
        
        const historyData = await ext.storage.local.get("usageHistory");
        const history = historyData.usageHistory || [];
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
    module.exports = { getSummaryCache, saveSummaryCache, saveUsageStats };
}
