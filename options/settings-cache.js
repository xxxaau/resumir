/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-cache.js
// Gestió de la memòria cau de resums
// --- Cache Management ---

/** «12 resums desats · uns 340 KB»: perquè es vegi què s'esborraria abans de fer-ho. */
async function renderHistoryInfo() {
    const out = document.getElementById("historyInfo");
    if (!out) return;
    try {
        const all = await ext.storage.local.get(null);
        const keys = Object.keys(all).filter(k => k.startsWith("summary_cache:"));
        if (keys.length === 0) { out.textContent = "Encara no hi ha cap resum desat."; return; }
        const bytes = keys.reduce((n, k) => n + k.length + JSON.stringify(all[k]).length, 0);
        const size = bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
        out.textContent = `${keys.length === 1 ? "1 resum desat" : `${keys.length} resums desats`} · uns ${size} en aquest ordinador.`;
    } catch {
        out.textContent = "";
    }
}

async function clearCache() {
    // Les entrades `summary_cache:*` SÓN l'historial de la barra lateral: no són
    // dues coses. El diàleg ha de dir-ho i quantes n'hi ha.
    let cacheKeys = [];
    try {
        const allData = await ext.storage.local.get(null);
        cacheKeys = Object.keys(allData).filter(k => k.startsWith("summary_cache:"));
    } catch (e) {
        console.error("Error reading cache:", e);
    }
    if (cacheKeys.length === 0) {
        showStatus("No hi havia cap resum desat.");
        return;
    }
    const n = cacheKeys.length;
    const noun = n === 1 ? "1 resum" : `${n} resums`;
    if (!confirm(`S'esborrarà tot l'historial (${noun}). No es pot desfer.`)) return;

    try {
        if (cacheKeys.length > 0) {
            await ext.storage.local.remove(cacheKeys);
        }
        await ext.storage.local.set({ ["summary_cache_index"]: [] });

        showStatus("Memòria de resums esborrada.");
        renderHistoryInfo();
    } catch (e) {
        console.error("Error clearing cache:", e);
        showStatus("Error esborrant la memòria cau.");
    }
}
