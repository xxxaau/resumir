// options/settings-stats.js
// Estadístiques d'us, gràfics i taula d'historial
// --- Statistics Logic ---

let PAGE_SIZE = 20;
let currentPage = 1;
let totalPages = 1;

async function loadStatistics() {
    try {
        const data = await ext.storage.local.get(["usageHistory", "pageSize"]);
        const history = data.usageHistory || []; // Array of {date, title, url, model, inputTokens, outputTokens, latency}

        if (data.pageSize) {
            PAGE_SIZE = data.pageSize;
            const selectEl = document.getElementById("pageSizeSelect");
            if (selectEl) selectEl.value = PAGE_SIZE.toString();
        }

        // 1. Update KPI Cards
        const elArticles = document.getElementById("statsArticles");
        const elTimeSaved = document.getElementById("kpiTimeSaved");

        if(elArticles) elArticles.textContent = history.length;
        
        // Calculate Time Saved (Estimated reading time - wait time)
        // Assume 1 token ~ 0.75 words, Average reading speed = 250 wpm.
        // Therefore, 1 token takes ~0.18 seconds to read. We use 0.2s for simplicity.
        let timeSavedSeconds = 0;
        if (history.length > 0) {
            timeSavedSeconds = history.reduce((acc, curr) => {
                const readSecs = (curr.inputTokens || 0) * 0.2;
                const waitSecs = (curr.latency || 0) / 1000;
                return acc + Math.max(0, readSecs - waitSecs);
            }, 0);
        }
        
        const hours = Math.floor(timeSavedSeconds / 3600);
        const minutes = Math.floor((timeSavedSeconds % 3600) / 60);
        if(elTimeSaved) elTimeSaved.textContent = `${hours}h ${minutes}m`;

        // Water consumption stats
        const WATER_ML = 0.26;
        const GLASS_ML = 300;
        const todayStr = new Date().toISOString().slice(0, 10);

        const todayCount = history.filter(e => {
            const ts = e.date || e.timestamp; // cache.js uses 'date'
            return ts && new Date(ts).toISOString().slice(0, 10) === todayStr;
        }).length;
        const totalCount = history.length;

        const todayMl  = todayCount  * WATER_ML;
        const totalMl  = totalCount  * WATER_ML;

        function fmtWater(ml) {
            if (ml < 1)    return ml.toFixed(2) + " ml";
            if (ml < GLASS_ML) return ml.toFixed(1) + " ml";
            return (ml / GLASS_ML).toFixed(2) + " gots";
        }

        const elWaterToday = document.getElementById("kpiWaterToday");
        const elWaterTotal = document.getElementById("kpiWaterTotal");
        if (elWaterToday) elWaterToday.textContent = fmtWater(todayMl);
        if (elWaterTotal) elWaterTotal.textContent = `Total acumulat: ${fmtWater(totalMl)}`;

        // Render Bar Chart
        renderDailyChart(history);

        // Grouped History Table
        renderGroupedHistoryTable(history);

        // 2. Render History Table with Pagination
        // Sort history by date desc (newest first)
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        totalPages = Math.ceil(sortedHistory.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const visibleHistory = sortedHistory.slice(startIndex, endIndex);
        
        renderHistoryTable(visibleHistory);

        // 3. Manage Pagination UI
        const prevBtn = document.getElementById("prevPage");
        const nextBtn = document.getElementById("nextPage");
        const pageInfo = document.getElementById("pageInfo");

        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;
        if (pageInfo) pageInfo.textContent = `Pàgina ${currentPage} de ${totalPages}`;

    } catch (e) {
        console.error("Error loading stats:", e);
    }
}


/**
 * Retorna el Date del dilluns de la setmana de la data donada (ISO 8601, setmana inicia dilluns).
 * @param {Date|string} date
 * @returns {Date}
 */
function getMondayOfWeek(date) {
    const d = new Date(date);
    d.setHours(12, 0, 0, 0); // migdia per evitar rollover UTC en zones horàries +N
    const day = d.getDay(); // 0=dg, 1=dl, ..., 6=ds
    const diff = day === 0 ? -6 : 1 - day; // dg: -6 dies; altres: cap enrere fins dl
    d.setDate(d.getDate() + diff);
    return d;
}

/**
 * Filtra l'historial d'ús per retornar només les entrades dins el període indicat.
 * Les entrades amb data invàlida es descarten.
 * @param {Array} history
 * @param {"7d"|"30d"|"6m"|"1a"} period
 * @returns {Array}
 */
function filterHistoryByPeriod(history, period) {
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    switch (period) {
        case "30d": cutoff.setDate(cutoff.getDate() - 29);        break;
        case "6m":  cutoff.setMonth(cutoff.getMonth() - 6);       break;
        case "1a":  cutoff.setFullYear(cutoff.getFullYear() - 1); break;
        default:    cutoff.setDate(cutoff.getDate() - 6);         break; // "7d"
    }
    return history.filter(entry => {
        const d = new Date(entry.date);
        return !isNaN(d.getTime()) && d >= cutoff;
    });
}

function getRelativeTime(dateInput) {
    const date = new Date(dateInput);
    const now = new Date();
    
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "fa uns segons";
    if (diffMins < 60) return `fa ${diffMins} minuts`;
    if (diffHours < 24 && now.getDate() === date.getDate()) {
        if (diffHours === 1) return "fa 1 hora";
        return `fa ${diffHours} hores`;
    }
    
    // For days, calculate calendar day difference
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inputDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today - inputDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "ahir";
    return `fa ${diffDays} dies`;
}

function renderDailyChart(history, period = "7d") {
    const container = document.getElementById("dailyChartContainer");
    if (!container) return;
    container.replaceChildren();

    // Actualitzar títol
    const chartTitles = {
        "7d":  "Resums per dia (últims 7 dies)",
        "30d": "Resums per dia (últims 30 dies)",
        "6m":  "Resums per setmana (últims 6 mesos)",
        "1a":  "Resums per mes (últim any)"
    };
    const titleEl = document.getElementById("chartTitle");
    if (titleEl) titleEl.textContent = chartTitles[period] || chartTitles["7d"];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Construir buckets
    const buckets = [];

    if (period === "7d") {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            buckets.push({
                key: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString("ca-ES", { weekday: "short" }),
                count: 0,
                showLabel: true
            });
        }
    } else if (period === "30d") {
        for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const isMonday = d.getDay() === 1;
            const isToday  = i === 0;
            buckets.push({
                key: d.toISOString().slice(0, 10),
                label: d.toLocaleDateString("ca-ES", { day: "2-digit", month: "2-digit" }),
                count: 0,
                showLabel: isMonday || isToday
            });
        }
    } else if (period === "6m") {
        const thisMonday = getMondayOfWeek(today);
        for (let i = 25; i >= 0; i--) {
            const monday = new Date(thisMonday);
            monday.setDate(monday.getDate() - i * 7);
            buckets.push({
                key: monday.toISOString().slice(0, 10),
                label: monday.toLocaleDateString("ca-ES", { day: "2-digit", month: "2-digit" }),
                count: 0,
                showLabel: i % 4 === 0 || i === 0
            });
        }
    } else { // "1a"
        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        for (let i = 11; i >= 0; i--) {
            const m = new Date(thisMonth);
            m.setMonth(m.getMonth() - i);
            buckets.push({
                key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`,
                label: m.toLocaleDateString("ca-ES", { month: "short" }),
                count: 0,
                showLabel: true
            });
        }
    }

    // Comptar entrades per bucket
    history.forEach(entry => {
        const d = new Date(entry.date);
        if (isNaN(d.getTime())) return;
        d.setHours(0, 0, 0, 0);

        let key;
        if (period === "6m") {
            key = getMondayOfWeek(d).toISOString().slice(0, 10);
        } else if (period === "1a") {
            key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        } else {
            key = d.toISOString().slice(0, 10);
        }
        const bucket = buckets.find(b => b.key === key);
        if (bucket) bucket.count++;
    });

    const maxCount = Math.max(...buckets.map(b => b.count), 1);
    const gapMap = { "7d": "10px", "30d": "3px", "6m": "4px", "1a": "6px" };
    container.style.gap = gapMap[period] || "10px";

    buckets.forEach(bucket => {
        const barWrapper = document.createElement("div");
        barWrapper.style.cssText = "display:flex;flex-direction:column;align-items:center;flex:1;height:100%;justify-content:flex-end;min-width:0;";

        const bar = document.createElement("div");
        const heightPct = (bucket.count / maxCount) * 80;
        bar.style.height = Math.max(heightPct, 2) + "%";
        bar.style.width = "70%";
        bar.style.backgroundColor = "var(--button-hover-bg)";
        bar.style.borderRadius = "4px 4px 0 0";
        bar.style.transition = "height 0.3s";
        bar.title = bucket.count === 1 ? "1 article resumit" : `${bucket.count} articles resumits`;

        const label = document.createElement("div");
        label.textContent = bucket.showLabel ? bucket.label : "";
        label.style.fontSize = period === "7d" ? "12px" : "10px";
        label.style.marginTop = "5px";
        label.style.color = "var(--text-muted)";
        label.style.textTransform = "capitalize";
        label.style.overflow = "hidden";
        label.style.whiteSpace = "nowrap";

        barWrapper.appendChild(bar);
        barWrapper.appendChild(label);
        container.appendChild(barWrapper);
    });
}

function renderGroupedHistoryTable(history) {
    const tbody = document.getElementById("groupedTableBody");
    if (!tbody) return;
    tbody.replaceChildren();

    if (history.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 8;
        td.style.textAlign = "center";
        td.style.color = "#999";
        td.textContent = "Encara no hi ha dades d'ús.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    // Agrupar per data (YYYY-MM-DD) i model
    const groups = {};
    history.forEach(entry => {
        const dateObj = new Date(entry.date);
        if (isNaN(dateObj.getTime())) return; // skip malformed entries
        const dayKey = dateObj.toLocaleDateString();
        const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const model = entry.model || "gemini-1.5-flash";

        const key = `${sortKey}|${dayKey}|${model}`;
        if (!groups[key]) {
            groups[key] = { sortKey, dayKey, model, requests: 0, inputTokens: 0, outputTokens: 0, cacheTokens: 0, totalLatency: 0, latencyCount: 0 };
        }
        groups[key].requests      += 1;
        groups[key].inputTokens   += entry.inputTokens  || 0;
        groups[key].outputTokens  += entry.outputTokens || 0;
        groups[key].cacheTokens   += entry.cacheTokens  || 0;
        if (entry.latency) {
            groups[key].totalLatency += entry.latency;
            groups[key].latencyCount += 1;
        }
    });

    function fmtLatency(totalMs, count) {
        if (count === 0) return "—";
        const avg = Math.round(totalMs / count);
        return avg < 1000 ? avg + "ms" : (avg / 1000).toFixed(1) + "s";
    }

    // Ordenar per data (descendent) i model (ascendent)
    const sortedGroups = Object.values(groups).sort((a, b) => {
        if (a.sortKey !== b.sortKey) return b.sortKey.localeCompare(a.sortKey);
        return a.model.localeCompare(b.model);
    });

    sortedGroups.forEach(group => {
        const tr = document.createElement("tr");

        // Data
        const tdDate = document.createElement("td");
        tdDate.textContent = group.dayKey;
        tr.appendChild(tdDate);

        // Model
        const tdModel = document.createElement("td");
        const code = document.createElement("code");
        code.style.fontSize = "0.85em";
        code.style.padding = "2px 4px";
        code.style.borderRadius = "4px";
        code.style.backgroundColor = "var(--bg-secondary)";
        code.textContent = group.model;
        tdModel.appendChild(code);
        tr.appendChild(tdModel);

        // Peticions
        const tdReq = document.createElement("td");
        tdReq.style.textAlign = "right";
        tdReq.textContent = group.requests;
        tr.appendChild(tdReq);

        // In tok
        const tdIn = document.createElement("td");
        tdIn.style.textAlign = "right";
        tdIn.textContent = group.inputTokens.toLocaleString();
        tr.appendChild(tdIn);

        // Out tok
        const tdOut = document.createElement("td");
        tdOut.style.textAlign = "right";
        tdOut.textContent = group.outputTokens.toLocaleString();
        tr.appendChild(tdOut);

        // Caché
        const tdCache = document.createElement("td");
        tdCache.style.textAlign = "right";
        tdCache.style.color = group.cacheTokens > 0 ? "inherit" : "var(--text-muted)";
        tdCache.textContent = group.cacheTokens.toLocaleString();
        tr.appendChild(tdCache);

        // ms∅
        const tdLat = document.createElement("td");
        tdLat.style.textAlign = "right";
        tdLat.style.color = "var(--text-muted)";
        tdLat.textContent = fmtLatency(group.totalLatency, group.latencyCount);
        tr.appendChild(tdLat);

        // Aigua
        const tdWater = document.createElement("td");
        tdWater.style.textAlign = "right";
        tdWater.style.color = "var(--text-muted)";
        tdWater.textContent = (group.requests * 0.26).toFixed(2);
        tr.appendChild(tdWater);

        tbody.appendChild(tr);
    });
}

function renderHistoryTable(history) {
    const tbody = document.getElementById("historyTableBody");
    tbody.replaceChildren(); // Clear content

    if (history.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 2;
        td.style.textAlign = "center";
        td.style.color = "#999";
        td.textContent = "Encara no hi ha dades d'ús.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    history.forEach(entry => {
        const tr = document.createElement("tr");
        
        // Date
        const tdDate = document.createElement("td");
        const dateObj = new Date(entry.date);
        tdDate.textContent = getRelativeTime(dateObj);
        tdDate.title = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        tr.appendChild(tdDate);
        
        // Title/Url
        const tdTitle = document.createElement("td");
        let prefix = entry.type === "deep" ? "+ " : "";
        
        if (entry.url) {
            const a = document.createElement("a");
            a.href = entry.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = prefix + (entry.title || "Sense títol");
            tdTitle.appendChild(a);
        } else {
            tdTitle.textContent = prefix + (entry.title || "Sense títol");
        }
        tr.appendChild(tdTitle);

        tbody.appendChild(tr);
    });
}

function clearHistory() {
    if (confirm("Estàs segur que vols esborrar l'historial de peticions?")) {
        ext.storage.local.set({ usageHistory: [] }).then(() => {
            currentPage = 1; // Reset pagination
            loadStatistics();
            showStatus("Historial esborrat.");
        });
    }
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getMondayOfWeek, filterHistoryByPeriod };
}
