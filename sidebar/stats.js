/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/stats.js
// Handles daily usage quota tracking and water consumption stats

/**
 * Returns today's request counts in a single storage read.
 * @returns {{ byModel: number, total: number }}
 */
async function getDailyStats(modelId) {
  try {
    const data = await ext.storage.local.get("usageHistory");
    const history = data.usageHistory || [];
    const todayStr = new Date().toISOString().slice(0, 10);
    let byModel = 0;
    let total = 0;
    for (const entry of history) {
      const ts = entry.date || entry.timestamp;
      if (!ts || new Date(ts).toISOString().slice(0, 10) !== todayStr) continue;
      total++;
      if (entry.model === modelId) byModel++;
    }
    return { byModel, total };
  } catch {
    return { byModel: 0, total: 0 };
  }
}

/** @deprecated Usa getDailyStats(modelId).byModel */
async function getTodayRequestCount(modelId) {
  return (await getDailyStats(modelId)).byModel;
}

/** @deprecated Usa getDailyStats(modelId).total */
async function getTotalTodayCount() {
  return (await getDailyStats("")).total;
}

/**
 * Refreshes water indicator + remaining requests when model changes.
 */
async function refreshRemainingOnModelChange(_modelId) {
  // Water indicator removed; no display to refresh
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getDailyStats, getTodayRequestCount, getTotalTodayCount };
}
