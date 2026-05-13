/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-cache.js
// Gestió de la memòria cau de resums
// --- Cache Management ---

const SUMMARY_CACHE_INDEX_KEY = "summary_cache_index";

async function updateCacheInfo() {
    try {
        const indexData = await ext.storage.local.get({ [SUMMARY_CACHE_INDEX_KEY]: [] });
        const cacheIndex = Array.isArray(indexData[SUMMARY_CACHE_INDEX_KEY]) ? indexData[SUMMARY_CACHE_INDEX_KEY] : [];

        let count = cacheIndex.length;
        let size = 0;
        if (count > 0) {
            const data = await ext.storage.local.get(cacheIndex);
            cacheIndex.forEach(key => {
                if (data[key]) {
                    size += JSON.stringify(data[key]).length;
                }
            });
        }
        
        const sizeStr = (size / 1024).toFixed(1) + " KB";
        const statusEl = document.getElementById("cacheStatus");
        if (statusEl) {
            statusEl.textContent = `${count} resums (${sizeStr})`;
        }
    } catch (e) {
        console.error("Error reading cache info:", e);
    }
}

async function clearCache() {
    if (!confirm("Estàs segur que vols esborrar la memòria cau de resums?")) return;

    try {
        // Enumerate every summary_cache:* key so orphan entries (whose ids are
        // no longer in the index, e.g. after a partial migration or crash) are
        // also removed. Falling back to the index alone would leak storage.
        const allData = await ext.storage.local.get(null);
        const cacheKeys = Object.keys(allData).filter(k => k.startsWith("summary_cache:"));

        if (cacheKeys.length > 0) {
            await ext.storage.local.remove(cacheKeys);
        }
        await ext.storage.local.set({ [SUMMARY_CACHE_INDEX_KEY]: [] });

        updateCacheInfo();
        showStatus("Memòria de resums esborrada.");
    } catch (e) {
        console.error("Error clearing cache:", e);
        showStatus("Error esborrant la memòria cau.");
    }
}
