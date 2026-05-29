/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-cache.js
// Gestió de la memòria cau de resums
// --- Cache Management ---

async function clearCache() {
    if (!confirm("Estàs segur que vols esborrar la memòria cau de resums?")) return;

    try {
        const allData = await ext.storage.local.get(null);
        const cacheKeys = Object.keys(allData).filter(k => k.startsWith("summary_cache:"));

        if (cacheKeys.length > 0) {
            await ext.storage.local.remove(cacheKeys);
        }
        await ext.storage.local.set({ ["summary_cache_index"]: [] });

        showStatus("Memòria de resums esborrada.");
    } catch (e) {
        console.error("Error clearing cache:", e);
        showStatus("Error esborrant la memòria cau.");
    }
}
