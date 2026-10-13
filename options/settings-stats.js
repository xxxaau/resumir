/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-stats.js
// Secció «Ús» de la configuració: les estadístiques que desa la barra lateral
// (storage.local: stats, usageHistory, dailyStats), mostrades i esborrables.

const USAGE_TYPE_LABELS = {
    summary: "Resum", deepdive: "Aprofundiment", science: "Validació científica",
    conceptmap: "Mapa conceptual", simple: "Explica-ho fàcil", anki: "Targetes Anki",
};

/**
 * Càlcul pur de les xifres a mostrar.
 * @param {Array} history - storage.local.usageHistory (fins a 1000 entrades, la més nova primer)
 * @param {{articles:number}} stats - storage.local.stats (comptador total, sobreviu al límit de l'historial)
 * @param {Date} now
 */
function computeUsageSummary(history, stats, now = new Date()) {
    const list = Array.isArray(history) ? history : [];
    const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
    const todayKey = dayKey(now);
    const weekAgo = now.getTime() - 7 * 86400000;
    let today = 0, last7 = 0, tokensIn = 0, tokensOut = 0, latencySum = 0, latencyN = 0;
    const byType = new Map(), byModel = new Map();
    for (const e of list) {
        const ts = new Date(e.date || e.timestamp).getTime();
        if (Number.isNaN(ts)) continue;
        if (dayKey(ts) === todayKey) today++;
        if (ts >= weekAgo) last7++;
        tokensIn += e.inputTokens || 0;
        tokensOut += e.outputTokens || 0;
        if (typeof e.latency === "number" && e.latency > 0) { latencySum += e.latency; latencyN++; }
        byType.set(e.type || "summary", (byType.get(e.type || "summary") || 0) + 1);
        if (e.model) byModel.set(e.model, (byModel.get(e.model) || 0) + 1);
    }
    const ranked = (m, key) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, count]) => ({ [key]: k, count }));
    return {
        total: stats && typeof stats.articles === "number" ? stats.articles : list.length,
        today, last7, tokensIn, tokensOut,
        avgLatencySec: latencyN ? Math.round(latencySum / latencyN / 100) / 10 : null,
        byType: ranked(byType, "type"),
        byModel: ranked(byModel, "model"),
    };
}

const _fmtNum = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

async function renderUsageStats() {
    const box = document.getElementById("usageContent");
    const clearBtn = document.getElementById("clearUsageStats");
    if (!box) return;
    let data = {};
    try { data = await ext.storage.local.get(["stats", "usageHistory"]); } catch { /* sense dades */ }
    const u = computeUsageSummary(data.usageHistory, data.stats);
    box.replaceChildren();
    if (u.total === 0 && u.byType.length === 0) {
        const p = document.createElement("p");
        p.className = "help-text";
        p.textContent = "Encara no hi ha dades: apareixeran quan generis resums.";
        box.appendChild(p);
        if (clearBtn) clearBtn.disabled = true;
        return;
    }
    if (clearBtn) clearBtn.disabled = false;

    const dl = document.createElement("dl");
    dl.className = "usage-grid";
    const row = (label, value) => {
        const dt = document.createElement("dt"); dt.textContent = label;
        const dd = document.createElement("dd"); dd.textContent = value;
        dl.append(dt, dd);
    };
    row("Resums generats", _fmtNum(u.total));
    row("Avui", _fmtNum(u.today));
    row("Últims 7 dies", _fmtNum(u.last7));
    row("Tokens enviats / rebuts", `${_fmtNum(u.tokensIn)} / ${_fmtNum(u.tokensOut)}`);
    if (u.avgLatencySec !== null) row("Temps de resposta mitjà", `${u.avgLatencySec.toFixed(1).replace(".", ",")} s`);
    box.appendChild(dl);

    const list = (title, items, label) => {
        if (!items.length) return;
        const h = document.createElement("p");
        h.className = "field-label";
        h.textContent = title;
        const ul = document.createElement("ul");
        ul.className = "usage-list";
        for (const it of items.slice(0, 5)) {
            const li = document.createElement("li");
            li.textContent = `${label(it)}: ${_fmtNum(it.count)}`;
            ul.appendChild(li);
        }
        box.append(h, ul);
    };
    list("Per tipus", u.byType, (it) => USAGE_TYPE_LABELS[it.type] || it.type);
    list("Per model", u.byModel, (it) => (typeof describeModel === "function" ? describeModel(it.model).name : it.model));
    const note = document.createElement("p");
    note.className = "help-text";
    note.textContent = `Es compten només els últims 1.000 resums per al detall; el total és el comptador complet. Les dades només són en aquest navegador.`;
    box.appendChild(note);
}

async function clearUsageStats() {
    if (!confirm("S'esborraran les estadístiques d'ús (no els resums ni l'historial). No es pot desfer.")) return;
    try {
        await ext.storage.local.remove(["stats", "usageHistory", "dailyStats"]);
        showStatus("Estadístiques esborrades.");
    } catch (e) {
        console.error("Error clearing usage stats:", e);
        showStatus("No s'han pogut esborrar les estadístiques.");
    }
    await renderUsageStats();
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { computeUsageSummary };
}
