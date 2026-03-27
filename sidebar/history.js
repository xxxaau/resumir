// sidebar/history.js
// History panel: browse and reload cached summaries from the sidebar

/** Stores which element was visible before the panel opened, for restoration. */
let _previousVisible = null;

/**
 * Opens the history panel.
 * Hides current content areas, loads cached summaries, renders the list.
 */
async function openHistoryPanel() {
    const historyPanel = document.getElementById("history-panel");
    const contentDiv   = document.getElementById("content");
    const loadingDiv   = document.getElementById("loading");
    const errorDiv     = document.getElementById("error");

    // Snapshot visible element (content or error) for restoration on close
    _previousVisible = null;
    if (!contentDiv.classList.contains("hidden")) _previousVisible = contentDiv;
    else if (!errorDiv.classList.contains("hidden")) _previousVisible = errorDiv;

    // Hide all content areas
    contentDiv.classList.add("hidden");
    loadingDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");

    // Build and show panel
    const entries = await listCachedSummaries();
    _renderHistoryPanel(historyPanel, entries);
    historyPanel.classList.remove("hidden");
}

/**
 * Closes the history panel and restores the previously visible element.
 */
function closeHistoryPanel() {
    const historyPanel = document.getElementById("history-panel");
    historyPanel.classList.add("hidden");
    historyPanel.innerHTML = "";
    if (_previousVisible) {
        _previousVisible.classList.remove("hidden");
        _previousVisible = null;
    }
}

/**
 * Loads a cached entry into the content area with current bionic settings,
 * then closes the history panel.
 * @param {{summary: string}} entry
 */
async function loadHistoryEntry(entry) {
    const contentDiv = document.getElementById("content");
    const localData = await ext.storage.local.get({ isBionicActive: false });
    const bionicEnabled = localData.isBionicActive === true;
    let fixation = 0.45;
    if (bionicEnabled) {
        const syncData = await ext.storage.sync.get({ bionicFixation: 30 });
        fixation = syncData.bionicFixation / 100;
    }
    contentDiv.replaceChildren(formatTextToFragment(entry.summary, bionicEnabled, fixation));
    contentDiv.classList.remove("hidden");
    closeHistoryPanel();
}

/**
 * Renders the history panel DOM with a back button and entry list.
 * @param {HTMLElement} panel
 * @param {Array} entries
 */
function _renderHistoryPanel(panel, entries) {
    panel.innerHTML = "";

    const header = document.createElement("div");
    header.className = "history-header";
    const backBtn = document.createElement("button");
    backBtn.className = "history-back-btn";
    backBtn.textContent = "\u2190 Tornar";
    backBtn.addEventListener("click", closeHistoryPanel);
    header.appendChild(backBtn);
    panel.appendChild(header);

    if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "history-empty";
        empty.textContent = "Sense historial disponible.";
        panel.appendChild(empty);
        return;
    }

    const list = document.createElement("ul");
    list.className = "history-list";
    for (const entry of entries) {
        const li = document.createElement("li");
        li.className = "history-item";

        const titleEl = document.createElement("span");
        titleEl.className = "history-item-title";
        const rawTitle = entry.title || entry.url || "Sense t\xEDtol";
        titleEl.textContent = rawTitle.length > 50 ? rawTitle.slice(0, 50) + "\u2026" : rawTitle;

        const metaEl = document.createElement("span");
        metaEl.className = "history-item-meta";
        metaEl.textContent = _relativeTime(entry.timestamp) + " \xB7 " + (entry.model || "");

        li.appendChild(titleEl);
        li.appendChild(metaEl);
        li.addEventListener("click", () => loadHistoryEntry(entry));
        list.appendChild(li);
    }
    panel.appendChild(list);
}

/**
 * Returns a human-readable relative time string for an ISO timestamp.
 * @param {string} isoString
 * @returns {string}
 */
function _relativeTime(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 60) return diffMin <= 1 ? "fa 1 min" : `fa ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return diffH === 1 ? "fa 1 h" : `fa ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "ahir";
    return `fa ${diffD} dies`;
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { openHistoryPanel, closeHistoryPanel, loadHistoryEntry };
}
