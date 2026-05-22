/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/history.js
// History panel: browse and reload cached summaries from the sidebar

/** Stores which element was visible before the panel opened, for restoration. */
let _previousVisible = null;
/** Stores whether the page-title-strip was visible before the panel opened. */
let _previousTitleStripVisible = false;

/**
 * Opens the history panel.
 * Hides current content areas, loads cached summaries, renders the list.
 */
async function openHistoryPanel() {
    const historyPanel  = document.getElementById("history-panel");
    const contentDiv    = document.getElementById("content");
    const loadingDiv    = document.getElementById("loading");
    const errorDiv      = document.getElementById("error");
    const backBar       = document.getElementById("history-back-bar");
    const toolbar       = document.querySelector(".toolbar");

    // Hide back bar (in case we're returning from detail view)
    if (backBar) backBar.classList.add("hidden");
    // Hide toolbar (no summarize/plugins while viewing history)
    if (toolbar) toolbar.classList.add("hidden");

    const titleStrip = document.getElementById("page-title-strip");
    _previousTitleStripVisible = titleStrip ? !titleStrip.classList.contains("hidden") : false;
    if (titleStrip) titleStrip.classList.add("hidden");

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
 * Closes a panel element and restores the previously visible element.
 * @param {HTMLElement} panelEl
 */
function _closePanel(panelEl) {
    panelEl.classList.add("hidden");
    panelEl.replaceChildren();
    // Show toolbar again, hide back bar (only visible when in history detail view)
    const toolbar = document.querySelector(".toolbar");
    if (toolbar) toolbar.classList.remove("hidden");
    const backBar = document.getElementById("history-back-bar");
    if (backBar) backBar.classList.add("hidden");

    // Restore original element order: toolbar → page-title-strip → history-back-bar → content
    const container = document.getElementById("container");
    const titleStrip = document.getElementById("page-title-strip");
    const contentDiv = document.getElementById("content");
    if (container && titleStrip && backBar && contentDiv && toolbar) {
        // Ensure order: toolbar is first, then title strip, then back bar, then content
        container.insertBefore(titleStrip, backBar);
        container.insertBefore(backBar, contentDiv);
    }

    if (_previousVisible) {
        _previousVisible.classList.remove("hidden");
        _previousVisible = null;
    }
    if (titleStrip) titleStrip.classList.toggle("hidden", !_previousTitleStripVisible);
    _previousTitleStripVisible = false;
}

/**
 * Closes the history panel and restores the previously visible element.
 */
function closeHistoryPanel() {
    _closePanel(document.getElementById("history-panel"));
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
    const CONCEPT_MAP_MARKER = "<!--conceptmap-->\n";
    const isConceptMap = entry.summary.startsWith(CONCEPT_MAP_MARKER);

    if (isConceptMap) {
        const mapText = entry.summary.substring(CONCEPT_MAP_MARKER.length);
        if (typeof renderMarkmapInteractive === "function" && typeof window.markmap !== "undefined") {
            contentDiv.replaceChildren(renderMarkmapInteractive(mapText));
        } else if (typeof parseConceptTree === "function") {
            contentDiv.replaceChildren(parseConceptTree(mapText, {}));
        } else {
            contentDiv.replaceChildren(formatTextToFragment(mapText, bionicEnabled, fixation));
        }
    } else {
        contentDiv.replaceChildren(formatTextToFragment(entry.summary, bionicEnabled, fixation));
    }
    contentDiv.classList.remove("hidden");

    // Hide history panel without restoring previous state
    const historyPanel = document.getElementById("history-panel");
    historyPanel.classList.add("hidden");
    historyPanel.replaceChildren();

    // Hide toolbar and show back bar (consistent whether coming from history list or cache badge)
    const toolbar = document.querySelector(".toolbar");
    if (toolbar) toolbar.classList.add("hidden");
    const backBar = document.getElementById("history-back-bar");
    if (backBar) backBar.classList.remove("hidden");
    const titleStrip = document.getElementById("page-title-strip");
    const titleLink  = document.getElementById("page-title-link");
    if (titleStrip && titleLink) {
        titleLink.textContent = entry.title || entry.url || "";
        try { titleLink.href = ["http:", "https:"].includes(new URL(entry.url).protocol) ? entry.url : "#"; } catch { titleLink.href = "#"; }
        titleStrip.classList.remove("hidden");
    }

    // Reorder elements: toolbar → back bar → title strip → content
    const container = document.getElementById("container");
    if (container && backBar && titleStrip && toolbar) {
        // Move back bar after toolbar, title strip after back bar
        container.insertBefore(backBar, toolbar.nextSibling);
        container.insertBefore(titleStrip, contentDiv);
    }
}

/**
 * Renders the history panel DOM with a back button and entry list.
 * @param {HTMLElement} panel
 * @param {Array} entries
 */
function _renderHistoryPanel(panel, entries) {
    panel.replaceChildren();

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

/**
 * Obre el panell de text planer enviat a resumir.
 * @param {string} text - Text planer a mostrar
 */
function openSourcePanel(text) {
    const sourcePanel  = document.getElementById("source-panel");
    const historyPanel = document.getElementById("history-panel");
    const contentDiv   = document.getElementById("content");
    const loadingDiv   = document.getElementById("loading");
    const errorDiv     = document.getElementById("error");
    const backBar      = document.getElementById("history-back-bar");
    const titleStrip   = document.getElementById("page-title-strip");
    const toolbar      = document.querySelector(".toolbar");

    // Tancar history panel si estava obert (sense restaurar estat)
    historyPanel.classList.add("hidden");
    historyPanel.replaceChildren();

    if (backBar) backBar.classList.add("hidden");
    // Hide toolbar (no summarize/plugins while viewing source)
    if (toolbar) toolbar.classList.add("hidden");
    _previousTitleStripVisible = titleStrip ? !titleStrip.classList.contains("hidden") : false;
    if (titleStrip) titleStrip.classList.add("hidden");

    // Capturar element visible per a restauració
    _previousVisible = null;
    if (!contentDiv.classList.contains("hidden")) _previousVisible = contentDiv;
    else if (!errorDiv.classList.contains("hidden")) _previousVisible = errorDiv;

    contentDiv.classList.add("hidden");
    loadingDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");

    // Construir panell
    sourcePanel.replaceChildren();

    const header = document.createElement("div");
    header.className = "history-header";

    const backBtn = document.createElement("button");
    backBtn.className = "history-back-btn";
    backBtn.textContent = "\u2190 Tornar";
    backBtn.addEventListener("click", closeSourcePanel);

    const label = document.createElement("span");
    label.className = "source-panel-label";
    label.textContent = "Text enviat a resumir";

    header.appendChild(backBtn);
    header.appendChild(label);
    sourcePanel.appendChild(header);

    const pre = document.createElement("pre");
    pre.textContent = text;
    sourcePanel.appendChild(pre);

    sourcePanel.classList.remove("hidden");
}

/**
 * Tanca el panell de text planer i restaura la vista anterior.
 */
function closeSourcePanel() {
    _closePanel(document.getElementById("source-panel"));
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { openHistoryPanel, closeHistoryPanel, loadHistoryEntry, openSourcePanel, closeSourcePanel };
}
