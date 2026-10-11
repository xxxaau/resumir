let _previousVisible = null;
let _previousTitleStripVisible = false;

async function openHistoryPanel() {
    const historyPanel  = document.getElementById("history-panel");
    const contentDiv    = document.getElementById("content");
    const loadingDiv    = document.getElementById("loading");
    const errorDiv      = document.getElementById("error");
    const backBar       = document.getElementById("history-back-bar");
    const toolbar       = document.querySelector(".toolbar");

    if (backBar) backBar.classList.add("hidden");
    if (toolbar) toolbar.classList.add("hidden");

    const titleStrip = document.getElementById("page-title-strip");
    _previousTitleStripVisible = titleStrip ? !titleStrip.classList.contains("hidden") : false;
    if (titleStrip) titleStrip.classList.add("hidden");

    _previousVisible = null;
    if (!contentDiv.classList.contains("hidden")) _previousVisible = contentDiv;
    else if (!errorDiv.classList.contains("hidden")) _previousVisible = errorDiv;

    contentDiv.classList.add("hidden");
    loadingDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");

    const entries = await listCachedSummaries();
    _renderHistoryPanel(historyPanel, entries);
    historyPanel.classList.remove("hidden");
    const heading = document.getElementById("history-heading");
    if (heading && typeof heading.focus === "function") heading.focus();
}

function _closePanel(panelEl) {
    panelEl.classList.add("hidden");
    panelEl.replaceChildren();
    const toolbar = document.querySelector(".toolbar");
    if (toolbar) toolbar.classList.remove("hidden");
    const backBar = document.getElementById("history-back-bar");
    if (backBar) backBar.classList.add("hidden");

    const container = document.getElementById("container");
    const titleStrip = document.getElementById("page-title-strip");
    const contentDiv = document.getElementById("content");
    if (container && titleStrip && backBar && contentDiv && toolbar) {
        container.insertBefore(titleStrip, backBar);
        container.insertBefore(backBar, contentDiv);
    }

    if (_previousVisible) {
        _previousVisible.classList.remove("hidden");
        _previousVisible = null;
    }
    if (titleStrip) titleStrip.classList.toggle("hidden", !_previousTitleStripVisible);
    _previousTitleStripVisible = false;

    // El focus era a un element que ara s'ha amagat/destruït: retorna'l al
    // botó que obre l'historial (la barra d'eines torna a ser visible).
    const historyBtn = document.getElementById("historyBtn");
    if (historyBtn && typeof historyBtn.focus === "function") historyBtn.focus();
}

function closeHistoryPanel() {
    _closePanel(document.getElementById("history-panel"));
}

async function loadHistoryEntry(entry) {
    const contentDiv = document.getElementById("content");
    const errorDiv = document.getElementById("error");
    const localData = await ext.storage.local.get({ isBionicActive: false });
    const bionicEnabled = localData.isBionicActive === true;
    let bionicConfig = {};
    let fixation = DEFAULT_BIONIC.fixation / 100;
    if (bionicEnabled) {
        const syncData = await ext.storage.sync.get({ bionicFixation: DEFAULT_BIONIC.fixation, bionicFont: undefined, bionicFontSize: undefined, bionicLineHeight: undefined, bionicWeight: DEFAULT_BIONIC.weight });
        bionicConfig = syncData;
        fixation = (syncData.bionicFixation || DEFAULT_BIONIC.fixation) / 100;
    }
    const CONCEPT_MAP_MARKER = "<!--conceptmap-->\n";
    const ANKI_MARKER = "<!--anki-->\n";
    const isConceptMap = entry.summary.startsWith(CONCEPT_MAP_MARKER);
    const isAnki = entry.summary.startsWith(ANKI_MARKER);

    if (isConceptMap) {
        const mapText = entry.summary.substring(CONCEPT_MAP_MARKER.length);
        if (typeof renderMarkmapInteractive === "function" && typeof window.markmapNative !== "undefined") {
            contentDiv.replaceChildren(renderMarkmapInteractive(mapText, entry.title, entry.url));
        } else if (typeof parseConceptTree === "function") {
            contentDiv.replaceChildren(parseConceptTree(mapText, {}));
        } else {
            contentDiv.replaceChildren(formatTextToFragment(mapText, bionicEnabled, fixation));
        }
    } else if (isAnki) {
        // Restaura el panell interactiu d'Anki des de la caché de l'Historial
        // (abans es renderitzava el JSON cru com a text pla: faltava aquesta
        // branca, tot i que summary.js ja hi guarda entrades d'aquest tipus).
        const cardsText = entry.summary.substring(ANKI_MARKER.length);
        const ankiConfig = await ext.storage.sync.get(["ankiVault", "obsidianVault", "ankiPath"]);
        setAnkiCards(parseAnkiCards(cardsText));
        renderAnkiPanel({
            contentDiv,
            errorDiv,
            getGlobalConfig: () => ankiConfig,
            // No tenim el text original de la pàgina fora d'una sessió de
            // generació activa (window.__ankiPageText no es persisteix a la
            // caché) — regenerar amb contingut equivocat seria pitjor que no
            // oferir-ho, així que expliquem la limitació en lloc de generar.
            onGenerateMore: () => {
                if (errorDiv) {
                    errorDiv.textContent = "«Genera més» i «Afinar» no estan disponibles per a targetes obertes des de l'Historial.";
                    errorDiv.classList.remove("hidden");
                }
            },
        });
    } else {
        contentDiv.replaceChildren(formatTextToFragment(entry.summary, bionicEnabled, fixation));
    }
    // applyBionicStyles (summary.js) és l'únic punt que estila #content en mode
    // biònic — manté la mida coherent amb la resta de camins (streaming, toggle).
    applyBionicStyles(contentDiv, bionicEnabled, bionicConfig);
    if (!isConceptMap && !isAnki && typeof linkPdfPages === "function") linkPdfPages(contentDiv, entry.url);
    if (!isConceptMap && !isAnki && typeof linkYoutubeTimes === "function") linkYoutubeTimes(contentDiv, entry.url);
    contentDiv.classList.remove("hidden");

    const historyPanel = document.getElementById("history-panel");
    historyPanel.classList.add("hidden");
    historyPanel.replaceChildren();

    const toolbar = document.querySelector(".toolbar");
    if (toolbar) toolbar.classList.add("hidden");
    const backBar = document.getElementById("history-back-bar");
    if (backBar) backBar.classList.remove("hidden");
    const titleStrip = document.getElementById("page-title-strip");
    const titleLink  = document.getElementById("page-title-link");
    if (titleStrip && titleLink) {
        titleLink.textContent = entry.title || entry.url || "";
        const href = getSourceHttpUrl(entry.url);
        if (href) titleLink.href = href; else titleLink.removeAttribute("href");
        titleStrip.classList.remove("hidden");
    }

    const container = document.getElementById("container");
    if (container && backBar && titleStrip && toolbar) {
        container.insertBefore(backBar, toolbar.nextSibling);
        container.insertBefore(titleStrip, contentDiv);
    }

    // L'entrada s'ha carregat al contingut: el focus no pot quedar al control de
    // la llista (que s'ha destruït). Va al botó «Tornar a l'historial».
    const backToHistory = document.getElementById("historyBackBtn");
    if (backToHistory && typeof backToHistory.focus === "function") backToHistory.focus();

    // Avisa sidebar.js que ara es veu AQUESTA entrada: Copiar/Obsidian/Biònica
    // treballen sobre currentMetadata, i sense això exportaven el resum anterior
    // (el que es veia abans d'obrir l'Historial) en tornar a la barra d'eines.
    if (typeof window !== "undefined" && typeof window.onHistoryEntryLoaded === "function") {
        const marker = isConceptMap ? CONCEPT_MAP_MARKER : isAnki ? ANKI_MARKER : "";
        window.onHistoryEntryLoaded({
            title: entry.title,
            url: entry.url,
            summary: entry.summary.substring(marker.length),
            type: isConceptMap ? "conceptmap" : isAnki ? "anki" : (entry.type || "summary"),
        });
    }
}

// Entrades que es mostren ara (per a esborrar/desfer i re-renderitzar).
let _historyEntries = [];
let _undoTimer = null;

function _matchesFilter(group, query) {
    if (!query) return true;
    const q = query.trim().toLowerCase();
    return (group.title || "").toLowerCase().includes(q) || (group.url || "").toLowerCase().includes(q);
}

function _renderHistoryPanel(panel, entries) {
    _historyEntries = entries;
    panel.replaceChildren();

    const header = document.createElement("div");
    header.className = "history-header";
    const backBtn = document.createElement("button");
    backBtn.className = "history-back-btn";
    backBtn.textContent = "\u2190 Tancar l'historial";
    backBtn.addEventListener("click", closeHistoryPanel);
    header.appendChild(backBtn);
    // Encapçalament enfocable: en obrir el panell s'hi mou el focus (la barra
    // d'eines s'amaga i el focus caldria que no quedés a <body>).
    const heading = document.createElement("h2");
    heading.className = "history-title";
    heading.id = "history-heading";
    heading.tabIndex = -1;
    heading.textContent = "Historial";
    header.appendChild(heading);
    panel.appendChild(header);

    // Cerca (només si hi ha prou entrades perquè serveixi de res)
    const listHost = document.createElement("div");
    listHost.className = "history-list-host";
    let searchInput = null;
    if (entries.length > 0) {
        searchInput = document.createElement("input");
        searchInput.type = "search";
        searchInput.className = "history-search";
        searchInput.placeholder = "Cerca per títol o adreça…";
        searchInput.setAttribute("aria-label", "Cerca a l'historial");
        searchInput.addEventListener("input", () => fill());
        panel.appendChild(searchInput);
    }
    // Filtre per tipus (només si hi ha més d'un tipus a l'historial)
    let typeFilter = null;
    const presentTypes = CONTENT_TYPES.filter(ct => entries.some(e => (e.type || "summary") === ct.id)).sort((a, b) => a.order - b.order);
    if (presentTypes.length > 1) {
        const bar = document.createElement("div");
        bar.className = "history-filters";
        bar.setAttribute("role", "group");
        bar.setAttribute("aria-label", "Filtra per tipus");
        const mk = (type, text, title, iconId) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "history-filter";
            if (type) b.dataset.type = type;
            if (iconId && typeof typeIconSvg === "function") b.appendChild(typeIconSvg(iconId, 12));
            b.appendChild(document.createTextNode(text));
            if (title) b.setAttribute("aria-label", title);
            b.addEventListener("click", () => {
                typeFilter = type;
                bar.querySelectorAll(".history-filter").forEach(x => x.setAttribute("aria-pressed", String((x.dataset.type || null) === type)));
                fill();
            });
            b.setAttribute("aria-pressed", String(type === null));
            bar.appendChild(b);
        };
        mk(null, "Tots");
        for (const ct of presentTypes) mk(ct.id, ct.label, ct.label, ct.id);
        panel.appendChild(bar);
    }
    const resultCount = document.createElement("p");
    resultCount.className = "sr-only";
    resultCount.setAttribute("role", "status");
    resultCount.setAttribute("aria-live", "polite");
    panel.appendChild(resultCount);
    panel.appendChild(listHost);

    const toast = document.createElement("div");
    toast.id = "history-toast";
    toast.className = "history-toast hidden";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    panel.appendChild(toast);

    function fill() {
        listHost.replaceChildren();
        if (_historyEntries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "history-empty";
            const days = typeof CACHE_TTL_DAYS === "number" ? CACHE_TTL_DAYS : 30;
            empty.textContent = `Aquí apareixeran els resums que generis. Es guarden ${days} dies, només en aquest navegador.`;
            listHost.appendChild(empty);
            resultCount.textContent = "";
            return;
        }
        const query = searchInput ? searchInput.value : "";
        const groups = _groupEntriesByUrl(_historyEntries).filter(g => _matchesFilter(g, query))
            .filter(g => !typeFilter || g.types.includes(typeFilter));
        if (groups.length === 0) {
            const none = document.createElement("p");
            none.className = "history-empty";
            none.textContent = "Cap resultat per a aquesta cerca.";
            listHost.appendChild(none);
            resultCount.textContent = "Cap resultat.";
            return;
        }
        resultCount.textContent = query ? `${groups.length} ${groups.length === 1 ? "resultat" : "resultats"}.` : "";
        listHost.appendChild(_buildHistoryList(groups, toast, fill));
    }
    fill();
}

function _buildHistoryList(groups, toast, refill) {
    const list = document.createElement("ul");
    list.className = "history-list";

    for (const group of groups) {
        const li = document.createElement("li");
        li.className = "history-item";
        // L'<li> és un contenidor; els controls interactius (títol, icones de
        // tipus i esborrar) són <button> germans. Abans l'<li> era role=button amb
        // role=button a dins (interactius niats: els interns quedaven inaccessibles).

        const topRow = document.createElement("div");
        topRow.className = "history-item-top";

        const rawTitle = group.title || group.url || "Sense t\xedtol";
        const titleEl = document.createElement("button");
        titleEl.type = "button";
        titleEl.className = "history-item-title";
        titleEl.textContent = rawTitle.length > 120 ? rawTitle.slice(0, 120) + "\u2026" : rawTitle;

        topRow.appendChild(titleEl);

        const sortedTypes = CONTENT_TYPES.filter(ct => group.types.includes(ct.id)).sort((a, b) => a.order - b.order);
        if (sortedTypes.length > 0) {
            const typesRow = document.createElement("span");
            typesRow.className = "history-entry-types";
            for (const ct of sortedTypes) {
                const typeIcon = document.createElement("button");
                typeIcon.type = "button";
                typeIcon.className = "type-icon";
                if (typeof typeIconSvg === "function") typeIcon.appendChild(typeIconSvg(ct.id));
                else typeIcon.textContent = ct.icon;
                typeIcon.title = ct.label;
                typeIcon.setAttribute("aria-label", `${ct.label}: ${rawTitle}`);
                typeIcon.dataset.type = ct.id;
                typeIcon.dataset.url = group.url;
                typeIcon.addEventListener("click", (e) => {
                    e.stopPropagation();
                    _loadTypeFromCache(group.url, ct.id);
                });
                typesRow.appendChild(typeIcon);
            }
            topRow.appendChild(typesRow);
        }

        // Esborrar l'entrada (tots els seus tipus), amb «Desfer»
        const del = document.createElement("button");
        del.type = "button";
        del.className = "history-delete";
        del.textContent = "\u2715";
        del.title = "Esborrar de l'historial";
        del.setAttribute("aria-label", `Esborrar de l'historial: ${rawTitle}`);
        del.addEventListener("click", (e) => {
            e.stopPropagation();
            _deleteGroup(group, toast, refill);
        });
        topRow.appendChild(del);

        li.appendChild(topRow);

        const metaEl = document.createElement("span");
        metaEl.className = "history-item-meta";
        metaEl.textContent = _relativeTime(group.latestTimestamp);
        metaEl.title = new Date(group.latestTimestamp).toLocaleString("ca");
        li.appendChild(metaEl);

        const openEntry = () => {
            const preferredType = group.types.includes("summary") ? "summary" : group.types[0];
            _loadTypeFromCache(group.url, preferredType);
        };
        // El teclat (Enter/Espai) el cobreix el <button> del títol; el clic a
        // qualsevol part de l'element (amb ratolí) també obre l'entrada.
        titleEl.addEventListener("click", (e) => { e.stopPropagation(); openEntry(); });
        li.addEventListener("click", openEntry);

        list.appendChild(li);
    }
    return list;
}

async function _deleteGroup(group, toast, refill) {
    const removed = _historyEntries.filter(e => e.url === group.url);
    for (const e of removed) {
        await deleteSummaryCache(e.url, e.type || "summary");
    }
    _historyEntries = _historyEntries.filter(e => e.url !== group.url);
    refill();

    // Avís amb «Desfer» durant uns segons (no hi ha confirmació prèvia: és més
    // ràpid i es pot revertir)
    if (_undoTimer) clearTimeout(_undoTimer);
    toast.replaceChildren();
    const msg = document.createElement("span");
    msg.textContent = "Entrada esborrada. ";
    const undo = document.createElement("button");
    undo.type = "button";
    undo.className = "history-undo";
    undo.textContent = "Desfer";
    undo.addEventListener("click", async () => {
        await restoreSummaryCacheEntries(removed);
        _historyEntries = _historyEntries.concat(removed)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        toast.classList.add("hidden");
        toast.replaceChildren();
        refill();
    });
    toast.append(msg, undo);
    toast.classList.remove("hidden");
    _undoTimer = setTimeout(() => { toast.classList.add("hidden"); toast.replaceChildren(); }, 8000);
}

async function _loadTypeFromCache(url, type) {
    const entry = await getSummaryCache(url, type);
    if (entry) {
        loadHistoryEntry(entry);
    } else {
        console.warn("No cache entry found for", url, type);
        const errorDiv = document.getElementById("error");
        if (errorDiv) {
            errorDiv.textContent = "No s'ha trobat l'entrada a la memòria cau per a aquest tipus de contingut.";
            errorDiv.classList.remove("hidden");
        }
    }
}

function _groupEntriesByUrl(entries) {
    const map = new Map();
    for (const entry of entries) {
        const existing = map.get(entry.url);
        if (existing) {
            existing.types.add(entry.type || "summary");
            if (entry.timestamp > existing.latestTimestamp) {
                existing.latestTimestamp = entry.timestamp;
                existing.title = entry.title || existing.title;
            }
        } else {
            map.set(entry.url, {
                url: entry.url,
                title: entry.title,
                latestTimestamp: entry.timestamp,
                types: new Set([entry.type || "summary"]),
            });
        }
    }
    return Array.from(map.values())
        .map(g => ({ ...g, types: Array.from(g.types) }))
        .sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
}

function _relativeTime(isoString) {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "ara mateix";
    if (diffMin < 60) return diffMin === 1 ? "fa 1 min" : `fa ${diffMin} min`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return diffH === 1 ? "fa 1 h" : `fa ${diffH} h`;
    const diffD = Math.floor(diffH / 24);
    if (diffD === 1) return "ahir";
    // Passada una setmana, «fa 23 dies» no diu res: data absoluta
    if (diffD > 7) return new Date(isoString).toLocaleDateString("ca", { day: "numeric", month: "short", year: "numeric" });
    return `fa ${diffD} dies`;
}

function openSourcePanel(text) {
    const sourcePanel  = document.getElementById("source-panel");
    const historyPanel = document.getElementById("history-panel");
    const contentDiv   = document.getElementById("content");
    const loadingDiv   = document.getElementById("loading");
    const errorDiv     = document.getElementById("error");
    const backBar      = document.getElementById("history-back-bar");
    const titleStrip   = document.getElementById("page-title-strip");
    const toolbar      = document.querySelector(".toolbar");

    historyPanel.classList.add("hidden");
    historyPanel.replaceChildren();

    if (backBar) backBar.classList.add("hidden");
    if (toolbar) toolbar.classList.add("hidden");
    _previousTitleStripVisible = titleStrip ? !titleStrip.classList.contains("hidden") : false;
    if (titleStrip) titleStrip.classList.add("hidden");

    _previousVisible = null;
    if (!contentDiv.classList.contains("hidden")) _previousVisible = contentDiv;
    else if (!errorDiv.classList.contains("hidden")) _previousVisible = errorDiv;

    contentDiv.classList.add("hidden");
    loadingDiv.classList.add("hidden");
    errorDiv.classList.add("hidden");

    sourcePanel.replaceChildren();

    const header = document.createElement("div");
    header.className = "history-header";

    const backBtn = document.createElement("button");
    backBtn.className = "history-back-btn";
    backBtn.textContent = "\u2190 Tornar al resum";
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

function closeSourcePanel() {
    _closePanel(document.getElementById("source-panel"));
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { openHistoryPanel, closeHistoryPanel, loadHistoryEntry, openSourcePanel, closeSourcePanel };
}
