// sidebar/stats.js
// Handles daily usage quota tracking and water consumption stats

/**
 * Counts today's requests for a specific model (for quota tracking).
 */
async function getTodayRequestCount(modelId) {
  try {
    const data = await ext.storage.local.get("usageHistory");
    const history = data.usageHistory || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return history.filter((entry) => {
      const ts = entry.date || entry.timestamp;
      return (
        entry.model === modelId &&
        ts &&
        new Date(ts).toISOString().slice(0, 10) === todayStr
      );
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Counts ALL today's requests (all models) for water consumption.
 */
async function getTotalTodayCount() {
  try {
    const data = await ext.storage.local.get("usageHistory");
    const history = data.usageHistory || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    return history.filter((entry) => {
      const ts = entry.date || entry.timestamp;
      return ts && new Date(ts).toISOString().slice(0, 10) === todayStr;
    }).length;
  } catch {
    return 0;
  }
}

/**
 * Refreshes water indicator + remaining requests when model changes.
 */
async function refreshRemainingOnModelChange(modelId) {
  const usedModel = await getTodayRequestCount(modelId);
  const totalAll = await getTotalTodayCount();
  updateWaterStats(totalAll, modelId, usedModel);
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getTodayRequestCount, getTotalTodayCount };
}
