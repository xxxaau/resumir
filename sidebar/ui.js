/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/ui.js
// Handles UI updates, timers, formatting, and DOM manipulation

const PLAY_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
// Quadrat d'aturar (no «pausa»: una generació aturada no es pot represa).
const STOP_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="1"></rect></svg>`;
const CHECK_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

const htmlParser = new DOMParser();
const getIcon = (str) => htmlParser.parseFromString(str, 'image/svg+xml').documentElement;

/**
 * Centralized logic to apply visibility of extension buttons based on config
 */
function applyExtensionVisibility(config) {
    if (!config) return;

    const isDeepDiveEnabled = config.enableDeepdive === true;

    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn) {
        copyBtn.style.display = config.enableMarkdown !== false ? "flex" : "none";
    }

    const obsidianBtnEl = document.getElementById("obsidianBtn");
    if (obsidianBtnEl) {
        obsidianBtnEl.style.display = config.enableObsidian ? "flex" : "none";
    }

    const bionicBtnEl = document.getElementById("bionicBtn");
    if (bionicBtnEl) {
        bionicBtnEl.style.display = config.enableBionic ? "flex" : "none";
    }

    const deepDiveBtnEl = document.getElementById("deepDiveBtn");
    if (deepDiveBtnEl) {
        deepDiveBtnEl.style.display = isDeepDiveEnabled ? "flex" : "none";
    }

    const scienceBtnEl = document.getElementById("scienceBtn");
    if (scienceBtnEl) {
        scienceBtnEl.style.display = config.enableScience ? "flex" : "none";
    }

    const explainSimpleBtnEl = document.getElementById("explainSimpleBtn");
    if (explainSimpleBtnEl) {
        explainSimpleBtnEl.style.display = config.enableSimple ? "flex" : "none";
    }

    const summarizeBtnEl = document.getElementById("summarizeBtn");
    if (summarizeBtnEl) {
        summarizeBtnEl.style.display = config.enableResum !== false ? "flex" : "none";
    }

    const selectPdfBtnEl = document.getElementById("selectPdfBtn");
    if (selectPdfBtnEl) {
        // PDF és core: per defecte actiu (només s'amaga si l'usuari el desactiva).
        selectPdfBtnEl.style.display = config.enablePdf !== false ? "flex" : "none";
    }

    const conceptMapBtnEl = document.getElementById("conceptMapBtn");
    if (conceptMapBtnEl) {
        conceptMapBtnEl.style.display = config.enableConceptMap ? "flex" : "none";
    }

    const ankiBtnEl = document.getElementById("ankiBtn");
    if (ankiBtnEl) {
        ankiBtnEl.style.display = config.enableAnki ? "flex" : "none";
    }

}

// Grups de la barra d'eines, en ordre fix (ids dels botons).
const TOOLBAR_GROUPS = [
    ["summarizeBtn", "selectPdfBtn", "explainSimpleBtn", "deepDiveBtn", "scienceBtn", "conceptMapBtn", "ankiBtn"], // Generar
    ["copyBtn", "obsidianBtn"],                                                                                  // Exportar
    ["bionicBtn"],                                                                                               // Vista
];

/**
 * Applies the user-defined order to the extension buttons
 */
function applyExtensionOrder(order) {
    if (!order || !Array.isArray(order) || order.length === 0) return;

    // Migrar ordres antics: si no conté 'resum', reinicialitzar a l'ordre canònic.
    // Cobreix tant els ordres antics hardcodejats com qualsevol ordre pre-v2.1.
    // Aquest bloc pot eliminar-se quan tots els usuaris actius hagin actualitzat a v2.2+.
    if (!order.includes("resum")) {
        order = [...DEFAULT_EXTENSION_ORDER];
        ext.storage.sync.set({ extensionOrder: order });
    } else if (!order.includes("selectpdf")) {
        // Migrate older saved orders to include selectpdf in 2a posicio
        const idx = order.indexOf("resum");
        if (idx !== -1) {
            order.splice(idx + 1, 0, "selectpdf");
        } else {
            order.unshift("selectpdf");
        }
        ext.storage.sync.set({ extensionOrder: order });
    } else if (!order.includes("anki")) {
        // Migrate older saved orders (pre-Anki) to include anki al final,
        // com a DEFAULT_EXTENSION_ORDER.
        order = [...order, "anki"];
        ext.storage.sync.set({ extensionOrder: order });
    }

    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return;

    const settingsBtnEl = document.getElementById("settingsBtn");

    const extensionIdToButtonId = {
        "resum": "summarizeBtn",
        "selectpdf": "selectPdfBtn",
        "obsidian": "obsidianBtn",
        "markdown": "copyBtn",
        "deepdive": "deepDiveBtn",
        "bionic": "bionicBtn",
        "science": "scienceBtn",
        "conceptmap": "conceptMapBtn",
        "simple": "explainSimpleBtn",
        "anki": "ankiBtn",
    };
    
    const orderedButtons = [];
    order.forEach(extId => {
        const buttonId = extensionIdToButtonId[extId];
        if (buttonId) {
            const btn = document.getElementById(buttonId);
            if (btn && btn.style.display !== "none") {
                orderedButtons.push(btn);
            }
        }
    });

    // Grups fixos: Generar | Exportar | Vista. L'ordre de l'usuari es respecta
    // DINS de cada grup (sort estable); abans una sola fila barrejava generadors,
    // exportadors i el commutador de vista segons l'ordre desat.
    const groupOf = (btn) => {
        const g = TOOLBAR_GROUPS.findIndex(ids => ids.includes(btn.id));
        return g === -1 ? TOOLBAR_GROUPS.length : g;
    };
    orderedButtons.sort((a, b) => groupOf(a) - groupOf(b));

    // Separadors visuals entre grups no buits (es recreen a cada ordenació)
    toolbar.querySelectorAll(".toolbar-sep").forEach(el => el.remove());
    let previousGroup = null;
    orderedButtons.forEach(btn => {
        const g = groupOf(btn);
        if (previousGroup !== null && g !== previousGroup && btn.parentNode === toolbar) {
            const sep = document.createElement("span");
            sep.className = "toolbar-sep";
            sep.setAttribute("aria-hidden", "true");
            toolbar.insertBefore(sep, settingsBtnEl || null);
        }
        previousGroup = g;
        if (btn.parentNode === toolbar) {
            toolbar.insertBefore(btn, settingsBtnEl || null);
        }
    });

    // Ensure settingsBtn is last
    if (settingsBtnEl && settingsBtnEl.parentNode === toolbar) {
        toolbar.appendChild(settingsBtnEl);
    }
}

/**
 * Obre la configuració, opcionalment directament a una pestanya i enfocant un
 * camp (enllaç profund `#tab=…&focus=…`). Sense destí, comportament de sempre
 * (openOptionsPage reusa la pestanya oberta). Amb destí, un clic a «Configurar»
 * d'un error de clau cau ja sobre el camp de la clau, i no a «General».
 */
function openSettings(target) {
    if (!target || (!target.tab && !target.focus)) {
        ext.runtime.openOptionsPage();
        return;
    }
    const params = [];
    if (target.tab) params.push(`tab=${encodeURIComponent(target.tab)}`);
    if (target.focus) params.push(`focus=${encodeURIComponent(target.focus)}`);
    ext.tabs.create({ url: ext.runtime.getURL(`options/settings.html#${params.join("&")}`) });
}

/**
 * Anuncia un missatge d'estat als lectors de pantalla via la regió polida
 * #sr-status (present i buida des de la càrrega: una regió creada i omplerta
 * en el mateix render sovint no s'anuncia). El contingut en streaming NO és una
 * regió activa (es llegiria a trossos); només s'anuncia el cicle de vida:
 * generant, completat, aturat. Es buida i s'omple 100 ms després perquè un
 * missatge idèntic consecutiu també s'anunciï.
 */
function announceStatus(message) {
    const el = typeof document !== "undefined" ? document.getElementById("sr-status") : null;
    if (!el) return;
    el.textContent = "";
    setTimeout(() => { el.textContent = message; }, 100);
}

/**
 * Etapa actual de la càrrega, com a text («Llegint la pàgina…», «Enviant a…»,
 * «Provant … (quota esgotada)…»). Abans només hi havia tres puntets: l'espera
 * inclou l'extracció de la pàgina (que pot trigar) i els fallbacks de model, i
 * no es veia en quin pas era.
 */
function setLoadingStage(message) {
    const el = typeof document !== "undefined" ? document.getElementById("loading-text") : null;
    if (el) el.textContent = message || "";
}

let currentActiveBtnId = "summarizeBtn";
let originalBtnContent = {};

/**
 * Sets the UI state depending on whether a summary is being generated or not
 */
function setGeneratingState(generating, hasContent = false, activeBtnId = "summarizeBtn") {
    const summarizeBtn = document.getElementById("summarizeBtn");
    const loadingDiv = document.getElementById("loading");
    const copyBtn = document.getElementById("copyBtn");

    if (generating) {
        currentActiveBtnId = activeBtnId;
        const activeBtn = document.getElementById(currentActiveBtnId);
        
        if (activeBtn && !originalBtnContent[currentActiveBtnId]) {
            originalBtnContent[currentActiveBtnId] = Array.from(activeBtn.childNodes).map(n => n.cloneNode(true));
        }
        
        if (activeBtn) {
            activeBtn.replaceChildren(getIcon(STOP_ICON_STR));
            activeBtn.classList.add("stop-btn");
            if (currentActiveBtnId === "summarizeBtn") {
                activeBtn.classList.remove("primary");
            }
            activeBtn.dataset.originalTitle = activeBtn.title || "";
            activeBtn.dataset.originalAriaLabel = activeBtn.getAttribute("aria-label") || "";
            activeBtn.title = "Aturar la generació";
            // L'aria-label estàtic preval sobre el title: sense això el lector
            // de pantalla seguiria anunciant «Resumir» en lloc d'«Aturar».
            activeBtn.setAttribute("aria-label", "Aturar la generació");
        }
        
        const allActionBtns = ["summarizeBtn", "deepDiveBtn", "scienceBtn", "copyBtn", "obsidianBtn", "conceptMapBtn", "explainSimpleBtn", "selectPdfBtn", "ankiBtn"];
        for (const btnId of allActionBtns) {
            if (btnId !== currentActiveBtnId) {
                const btn = document.getElementById(btnId);
                if (btn) btn.disabled = true;
            }
        }
        
        // L'Historial amaga la barra d'eines (i amb ella el botó d'aturar): mentre es genera no s'hi pot entrar
        const historyBtn = document.getElementById("historyBtn");
        if (historyBtn) { historyBtn.disabled = true; historyBtn.dataset.generatingTitle = historyBtn.title; historyBtn.title = "L'historial no està disponible mentre es genera"; }

        loadingDiv.classList.remove("hidden");
        setLoadingStage("Llegint la pàgina…");
        announceStatus("Generant…");
    } else {
        const activeBtn = document.getElementById(currentActiveBtnId);
        if (activeBtn && originalBtnContent[currentActiveBtnId]) {
            const stored = originalBtnContent[currentActiveBtnId];
            if (Array.isArray(stored) && stored.length > 0) {
                activeBtn.replaceChildren(...stored.map(n => n.cloneNode(true)));
            }
            delete originalBtnContent[currentActiveBtnId];
            activeBtn.classList.remove("stop-btn");
            if (currentActiveBtnId === "summarizeBtn") {
                activeBtn.classList.add("primary");
            }
            if (activeBtn.dataset.originalTitle) {
                activeBtn.title = activeBtn.dataset.originalTitle;
            }
            if (activeBtn.dataset.originalAriaLabel) {
                activeBtn.setAttribute("aria-label", activeBtn.dataset.originalAriaLabel);
            } else {
                activeBtn.removeAttribute("aria-label");
            }
        }
        
        loadingDiv.classList.add("hidden");
        stopGenerationTimer();
        
        if (copyBtn) copyBtn.disabled = !hasContent;
        const obsidianBtn = document.getElementById("obsidianBtn");
        if (obsidianBtn) obsidianBtn.disabled = !hasContent;
        const bionicBtn = document.getElementById("bionicBtn");
        if (bionicBtn) bionicBtn.disabled = false;
        
        const deepDiveBtn = document.getElementById("deepDiveBtn");
        if (deepDiveBtn) deepDiveBtn.disabled = false;
        const scienceBtn = document.getElementById("scienceBtn");
        if (scienceBtn) scienceBtn.disabled = false;
        const conceptMapBtn = document.getElementById("conceptMapBtn");
        if (conceptMapBtn) conceptMapBtn.disabled = false;
        const explainSimpleBtn = document.getElementById("explainSimpleBtn");
        if (explainSimpleBtn) explainSimpleBtn.disabled = false;
        const selectPdfBtn = document.getElementById("selectPdfBtn");
        if (selectPdfBtn) selectPdfBtn.disabled = false;
        const ankiBtn = document.getElementById("ankiBtn");
        if (ankiBtn) ankiBtn.disabled = false;

        if (summarizeBtn) summarizeBtn.disabled = false;

        const historyBtn = document.getElementById("historyBtn");
        if (historyBtn) {
            historyBtn.disabled = false;
            if (historyBtn.dataset.generatingTitle) { historyBtn.title = historyBtn.dataset.generatingTitle; delete historyBtn.dataset.generatingTitle; }
        }
    }
}

/**
 * Resets the UI buttons state and applies configuration visibility
 */
function resetUI(hasContent, config = null) {
    const loadingDiv = document.getElementById("loading");
    loadingDiv.classList.add("hidden");
    
    const summarizeBtn = document.getElementById("summarizeBtn");
    summarizeBtn.disabled = false;
    
    const copyBtn = document.getElementById("copyBtn");
    
    // Enabling buttons synchronously so user can interact without waiting for config load
    if (copyBtn) copyBtn.disabled = !hasContent;
    const obsidianBtn = document.getElementById("obsidianBtn");
    if (obsidianBtn) obsidianBtn.disabled = !hasContent;
    const bionicBtn = document.getElementById("bionicBtn");
    if (bionicBtn) bionicBtn.disabled = false;
    const deepDiveBtn = document.getElementById("deepDiveBtn");
    if (deepDiveBtn) deepDiveBtn.disabled = false;
    const scienceBtn = document.getElementById("scienceBtn");
    if (scienceBtn) scienceBtn.disabled = false;
    const conceptMapBtn = document.getElementById("conceptMapBtn");
    if (conceptMapBtn) conceptMapBtn.disabled = false;
    const explainSimpleBtn = document.getElementById("explainSimpleBtn");
    if (explainSimpleBtn) explainSimpleBtn.disabled = false;
    const selectPdfBtn = document.getElementById("selectPdfBtn");
    if (selectPdfBtn) selectPdfBtn.disabled = false;
    const ankiBtn = document.getElementById("ankiBtn");
    if (ankiBtn) ankiBtn.disabled = false;

    if (config) {
        applyExtensionVisibility(config);
        applyExtensionOrder(config.extensionOrder || DEFAULT_EXTENSION_ORDER);
    } else {
        ext.storage.sync
            .get(["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableScience", "enableSimple", "enablePdf", "enableAnki", "extensionOrder"])
            .then(fetchedConfig => {
                applyExtensionVisibility(fetchedConfig);
                applyExtensionOrder(fetchedConfig.extensionOrder || DEFAULT_EXTENSION_ORDER);
            })
            .catch(e => console.error("Error refreshing visibility config:", e));
    }
}

// --- Text Formatting (Markdown & Bionic) ---

function formatBionicText(text, fixation = 0.45) {
    const fragment = document.createDocumentFragment();
    const parts = text.split(/(\s+)/); 
    parts.forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
             fragment.appendChild(document.createTextNode(part));
             return;
        }

        const len = part.length;
        if (len === 0) return;

        let boldLen = 1;
        if (len > 3) {
            boldLen = Math.ceil(len * fixation);
        }
        
        const boldStr = part.slice(0, boldLen);
        const restStr = part.slice(boldLen);
        
        const b = document.createElement("b");
        b.textContent = boldStr;
        fragment.appendChild(b);
        fragment.appendChild(document.createTextNode(restStr));
    });
    return fragment;
}

function formatTextToFragment(text, bionic = false, fixation = 0.45) {
    if (!text) return document.createDocumentFragment();
    const fragment = document.createDocumentFragment();
    const lines = text.split(/\n/);
    
    const parseTextWithLinks = (str) => {
        const frag = document.createDocumentFragment();
        // Detects markdown links [text](url), bare https:// URLs, and DOIs
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/[^\s<>"')\]]*[^\s<>"')\].,;!?])|\b(?:doi\.org\/|doi:\s*|DOI:\s*)(10\.\d+\/[^\s<>"')\]]*[^\s<>"')\].,;!?])/g;
        let lastIndex = 0;
        let match;
        while ((match = linkRegex.exec(str)) !== null) {
            const before = str.slice(lastIndex, match.index);
            if (before) {
                frag.appendChild(bionic ? formatBionicText(before, fixation) : document.createTextNode(before));
            }
            const a = document.createElement('a');
            
            if (match[2]) { // Markdown link
                a.href = match[2];
                a.textContent = match[1];
            } else if (match[3]) { // Raw URL
                a.href = match[3];
                a.textContent = match[3];
            } else if (match[4]) { // DOI
                a.href = "https://doi.org/" + match[4];
                a.textContent = "DOI: " + match[4];
            }

            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            frag.appendChild(a);
            lastIndex = linkRegex.lastIndex;
        }
        if (lastIndex < str.length) {
            const remaining = str.slice(lastIndex);
            frag.appendChild(bionic ? formatBionicText(remaining, fixation) : document.createTextNode(remaining));
        }
        return frag;
    };

    // En línia: **gras**, *cursiva* i `codi` (la resta, text amb enllaços/biònica).
    // Abans només s'entenia el gras: la cursiva i el codi es veien amb els
    // asteriscs i les cometes literals.
    const INLINE_TOKEN = /(\*\*.+?\*\*|`[^`\n]+`|\*[^*\s][^*\n]*?\*)/g;
    const formatInline = (textStr) => {
        const span = document.createElement('span');
        textStr.split(INLINE_TOKEN).forEach((part) => {
            if (!part) return;
            if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
                const strong = document.createElement('strong');
                strong.textContent = part.slice(2, -2);
                span.appendChild(strong);
            } else if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
                const code = document.createElement('code');
                code.textContent = part.slice(1, -1);
                span.appendChild(code);
            } else if (part.length > 2 && part.startsWith("*") && part.endsWith("*") && !part.startsWith("**")) {
                const em = document.createElement('em');
                em.textContent = part.slice(1, -1);
                span.appendChild(em);
            } else {
                span.appendChild(parseTextWithLinks(part));
            }
        });
        return span;
    };

    // Piles de llistes imbricades: [{ indent, type, el, lastLi }]
    let listStack = [];
    const closeLists = () => { listStack = []; };
    const indentOf = (ws) => ws.replace(/\t/g, "    ").length;
    let inFence = false;
    let fenceLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        // Blocs de codi ```
        if (trimmed.startsWith("```")) {
            if (inFence) {
                const pre = document.createElement('pre');
                const code = document.createElement('code');
                code.textContent = fenceLines.join("\n");
                pre.appendChild(code);
                fragment.appendChild(pre);
                fenceLines = [];
            } else {
                closeLists();
            }
            inFence = !inFence;
            continue;
        }
        if (inFence) { fenceLines.push(line); continue; }

        // Una línia en blanc NO tanca la llista (els models separen els items
        // amb línies en blanc i es trencava en llistes d'un item amb la
        // numeració reiniciada); la tanca el primer bloc que no sigui item.
        if (trimmed === "") continue;

        // Regla horitzontal
        if (/^([-*_])(\s*\1){2,}$/.test(trimmed)) {
            closeLists();
            fragment.appendChild(document.createElement('hr'));
            continue;
        }

        // Headers
        const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
            closeLists();
            const level = headerMatch[1].length;
            const h = document.createElement(`h${level}`);
            h.appendChild(formatInline(headerMatch[2]));
            fragment.appendChild(h);
            continue;
        }

        // Items de llista: -, *, + o 1. / 1), amb sagnat → llistes imbricades
        const itemMatch = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)/);
        if (itemMatch) {
            const indent = indentOf(itemMatch[1]);
            const ordered = /\d/.test(itemMatch[2]);
            const type = ordered ? "ol" : "ul";

            while (listStack.length && indent < listStack[listStack.length - 1].indent) listStack.pop();
            let top = listStack[listStack.length - 1];

            const makeList = () => {
                const list = document.createElement(type);
                if (ordered) {
                    const start = parseInt(itemMatch[2], 10);
                    if (start > 1) list.start = start;
                }
                const parent = listStack.length ? listStack[listStack.length - 1].lastLi : null;
                (parent || fragment).appendChild(list);
                return { indent, type, el: list, lastLi: null };
            };

            if (!top || indent > top.indent) {
                top = makeList();
                listStack.push(top);
            } else if (top.type !== type) {
                // Mateix sagnat però canvia el tipus (ul ↔ ol): llista germana nova
                listStack.pop();
                top = makeList();
                listStack.push(top);
            }

            const li = document.createElement('li');
            li.appendChild(formatInline(itemMatch[3]));
            top.el.appendChild(li);
            top.lastLi = li;
            continue;
        }

        // Regular Paragraph
        closeLists();
        const p = document.createElement('p');
        p.appendChild(formatInline(line));
        fragment.appendChild(p);
    }

    // Bloc de codi sense tancar (resposta tallada): es mostra tal com és
    if (inFence && fenceLines.length) {
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.textContent = fenceLines.join("\n");
        pre.appendChild(code);
        fragment.appendChild(pre);
    }

    return fragment;
}

// --- Status and Timers ---


let generationInterval = null;
let generationStartTime = 0;

function startGenerationTimer() {
    if (generationInterval) clearInterval(generationInterval);
    
    const timerEl = document.getElementById("generation-timer");
    timerEl.textContent = "0.0s";
    timerEl.title = "Temps de resposta";
    timerEl.style.color = "var(--text-muted)";
    
    generationStartTime = Date.now();
    
    generationInterval = setInterval(() => {
        const elapsed = (Date.now() - generationStartTime) / 1000;
        timerEl.textContent = elapsed.toFixed(1) + "s";
    }, 100);

    return generationStartTime;
}

// outcome: "ok" (verd) o "error" (vermell). Un segon stop sense cap generació
// en marxa (p. ex. el de setGeneratingState(false) després d'un error) no
// repinta el cronòmetre: abans sempre acabava verd, també després d'un error.
function stopGenerationTimer(outcome = "ok") {
    const wasRunning = generationInterval !== null;
    if (generationInterval) clearInterval(generationInterval);
    generationInterval = null;
    if (!wasRunning) return;

    const timerEl = document.getElementById("generation-timer");
    if (timerEl) {
        timerEl.style.color = outcome === "error" ? "var(--error-text)" : "var(--success)";
    }
}

/**
 * Formats a number with thousands separator (.) and millions notation (M).
 * Examples: 1000 → "1.000", 1500000 → "1,5M", 950000 → "950.000"
 * @param {number} num - The number to format
 * @returns {string} Formatted number
 */
function formatTokenCount(num) {
    if (num === 0 || num < 0) return "-";

    num = Math.round(num);

    if (num >= 1_000_000) {
        const m = num / 1_000_000;
        return (m % 1 === 0 ? m : m.toFixed(1).replace(".", ",")) + "M";
    }

    if (num >= 100_000) {
        const k = num / 1_000;
        return (k % 1 === 0 ? k : k.toFixed(1).replace(".", ",")) + "k";
    }

    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Formats token counts for tooltip text using full integer notation.
 * @param {number} num - Token count
 * @returns {string} Formatted full number (no M abbreviation)
 */
function formatTokenTooltipCount(num) {
    const safeNum = Math.max(0, Math.round(num || 0));
    return safeNum.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * Updates the token count display in the footer.
 * @param {number} inputTokens - Number of tokens sent to the API
 * @param {number} outputTokens - Number of tokens received from the API
 * @param {Object} options - Tooltip and live-state options
 * @param {boolean} options.inputEstimated - Whether input tokens are estimated
 * @param {boolean} options.outputEstimated - Whether output tokens are estimated
 */
function updateTokenStats(inputTokens, outputTokens, options = {}) {
    const tokensInCount = document.getElementById("tokens-in-count");
    const tokensOutCount = document.getElementById("tokens-out-count");
    const tokensIn = document.getElementById("tokens-in");
    const tokensOut = document.getElementById("tokens-out");

    const inputEstimated = options.inputEstimated === true;
    const outputEstimated = options.outputEstimated === true;

    if (tokensInCount) {
        tokensInCount.textContent = inputTokens > 0 ? formatTokenCount(inputTokens) : "–";
    }

    if (tokensOutCount) {
        tokensOutCount.textContent = outputTokens > 0 ? formatTokenCount(outputTokens) : "–";
    }

    if (tokensIn) {
        const prefix = inputEstimated ? "Estimació: " : "";
        tokensIn.title = `${prefix}${formatTokenTooltipCount(inputTokens)} tokens enviats`;
    }

    if (tokensOut) {
        const prefix = outputEstimated ? "Estimació: " : "";
        tokensOut.title = `${prefix}${formatTokenTooltipCount(outputTokens)} tokens rebuts`;
    }
}

/**
 * Mostra un error a `el`: el codi intern ([007], [PDF-013]) va al final i atenuat («(codi 007)»),
 * no al començament. Reutilitzat per tots els camins d'error (resum, selector de PDF…).
 */
function setErrorMessage(el, message) {
    const codeMatch = /^\[([A-Z]*-?\d+)\]\s*/.exec(message || "");
    el.textContent = codeMatch ? message.slice(codeMatch[0].length) : (message || "");
    if (codeMatch) {
        const code = document.createElement("span");
        code.className = "error-code";
        code.textContent = ` (codi ${codeMatch[1]})`;
        el.appendChild(code);
    }
    el.classList.remove("hidden");
}

/**
 * Línia de procedència sota el resum: de quant text es basa, amb quin model i
 * quants tokens, i un avís explícit si el text s'ha tallat.
 * @param {{words?: number, model?: string, inputTokens?: number, outputTokens?: number, truncated?: boolean}} info
 */
function renderProvenance(info) {
    const el = document.getElementById("provenance");
    if (!el) return;
    const parts = [];
    if (info.words > 0) parts.push(`Basat en ${formatTokenTooltipCount(info.words)} paraules`);
    if (info.model) parts.push(typeof describeModel === "function" ? describeModel(info.model).name : info.model);
    const tokens = Math.round((info.inputTokens || 0) + (info.outputTokens || 0));
    if (tokens > 0) parts.push(`${formatTokenTooltipCount(tokens)} tokens`);
    if (info.truncated) parts.push("text tallat: només s'ha resumit el principi");
    if (info.cookieBanner) parts.push("el text capturat sembla un avís de galetes, no l'article");
    el.textContent = parts.join(" · ");
    if (parts.length > 0 && info.words > 0) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-link";
        btn.textContent = "Veure el text enviat";
        btn.addEventListener("click", () => document.getElementById("sourceTextBtn")?.click());
        el.append(" · ", btn);
    }
    el.classList.toggle("is-warning", !!(info.truncated || info.cookieBanner));
    el.classList.toggle("hidden", parts.length === 0);
}

/** Heurística: text curt i ple de «cookies» = s'ha capturat el bàner, no l'article. */
function looksLikeCookieBanner(text) {
    const t = String(text || "");
    const words = t.trim().split(/\s+/).filter(Boolean).length;
    const hits = (t.match(/cookies?|galetes|consent|consentiment/gi) || []).length;
    return words < 400 && hits >= 3;
}

/**
 * Converteix en enllaços les coincidències d'una expressió curta (p. ex. «[1:05]», «(p. 3)») dins
 * d'un contenidor, encara que quedin repartides entre diversos nodes de text: amb la lectura biònica
 * cada paraula va partida en <b> i «[1:05]» es converteix en «[1:» + «05]». `build(match)` torna
 * l'<a> (buit) o null. Es treballa sobre el text sencer i d'enrere cap endavant perquè els
 * desplaçaments dels nodes anteriors no canviïn.
 */
function linkTextMatches(container, re, build) {
    const nodes = [];
    let full = "";
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.parentElement && n.parentElement.closest("a")) continue;
        nodes.push({ node: n, start: full.length });
        full += n.nodeValue;
    }
    const locate = (offset, atEnd) => {
        for (const { node, start } of nodes) {
            const end = start + node.nodeValue.length;
            if (atEnd ? (offset > start && offset <= end) : (offset >= start && offset < end)) return [node, offset - start];
        }
        return null;
    };
    const matches = [...full.matchAll(new RegExp(re.source, "g"))].reverse();
    for (const m of matches) {
        const a = build(m);
        const from = locate(m.index, false), to = locate(m.index + m[0].length, true);
        if (!a || !from || !to) continue;
        const range = document.createRange();
        range.setStart(from[0], from[1]);
        range.setEnd(to[0], to[1]);
        a.appendChild(range.extractContents());
        range.insertNode(a);
    }
}

/**
 * Converteix les cites «(p. N)» d'un resum de PDF web en enllaços a `url#page=N`
 * (el visor de PDF del navegador entén #page=N). No fa res si no és un PDF.
 */
function linkPdfPages(container, url) {
    if (!container || !/^https?:/i.test(url || "") || typeof isPdfUrl !== "function" || !isPdfUrl(url)) return;
    const base = url.split("#")[0];
    linkTextMatches(container, /\(p\. (\d+)\)/, (m) => {
        const a = document.createElement("a");
        a.href = `${base}#page=${m[1]}`;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.dataset.pdfPage = m[1];
        a.title = `Obre el PDF a la pàgina ${m[1]}`;
        return a;
    });
}

/** ID del vídeo d'una URL de YouTube (watch?v=), o null. */
function youtubeVideoId(url) {
    try {
        const u = new URL(url);
        if (!/(^|\.)youtube\.com$/.test(u.hostname) || u.pathname !== "/watch") return null;
        return u.searchParams.get("v");
    } catch { return null; }
}

/**
 * Converteix les marques «[m:ss]» / «[h:mm:ss]» d'un resum de vídeo en enllaços
 * `watch?v=ID&t=Ns`. No fa res si la URL no és un vídeo de YouTube.
 */
function linkYoutubeTimes(container, url) {
    const id = youtubeVideoId(url);
    if (!container || !id) return;
    linkTextMatches(container, /\[(?:(\d+):)?(\d{1,2}):(\d{2})\]/, (m) => {
        const secs = (Number(m[1] || 0) * 3600) + Number(m[2]) * 60 + Number(m[3]);
        const a = document.createElement("a");
        a.href = `https://www.youtube.com/watch?v=${encodeURIComponent(id)}&t=${secs}s`;
        a.dataset.ytTime = String(secs);
        a.title = "Anar a aquest moment del vídeo";
        return a;
    });
}

/**
 * Fa clicables les cites «…» de les seccions «Cites» i «Punts clau»: en clicar-ne una,
 * sidebar.js la busca a la pàgina, la ressalta en groc i hi desplaça la vista (com un
 * Ctrl+F). Només té sentit si el text surt de la pàgina tal com es veu: no en PDF
 * (el visor és una altra pàgina) ni en vídeos de YouTube (la transcripció no és al DOM).
 */
function linkQuotes(container, url) {
    if (!container) return;
    if (!/^https?:/i.test(url || "")) return;
    if (typeof isPdfUrl === "function" && isPdfUrl(url)) return;
    if (/^https?:\/\/([^/]+\.)?youtube\.com\/watch/i.test(url)) return;
    // «Cites» → la 1a frase entre «» de l'element; «Punts clau» → l'última (la que el model
    // hi afegeix al final com a suport del punt).
    const SECTIONS = { "cites": "first", "punts clau": "last" };
    const work = [];
    let mode = null;
    for (const el of container.children) {
        if (/^H[1-6]$/.test(el.tagName)) {
            // Tolerant: «Cites», «Cites literals», «Punts clau (resum)»…
            const title = el.textContent.trim().toLowerCase();
            const key = Object.keys(SECTIONS).find(k => title === k || title.startsWith(k + " ") || title.startsWith(k + ":"));
            mode = key ? SECTIONS[key] : null;
            continue;
        }
        if (!mode) continue;
        for (const li of el.matches("li") ? [el] : el.querySelectorAll("li")) work.push({ li, mode });
    }
    for (const { li, mode: which } of work) {
        // Es treballa sobre el text sencer de l'element, no node a node: amb la lectura biònica cada
        // paraula va partida en <b> i la cita quedaria repartida entre molts nodes de text.
        const nodes = [];
        const walker = document.createTreeWalker(li, NodeFilter.SHOW_TEXT);
        let full = "";
        for (let n = walker.nextNode(); n; n = walker.nextNode()) { nodes.push({ node: n, start: full.length }); full += n.nodeValue; }
        const found = [...full.matchAll(/«([^»]{8,})»|“([^”]{8,})”|"([^"]{8,})"/g)];
        if (!found.length) continue;
        const m = which === "last" ? found[found.length - 1] : found[0];
        const locate = (offset, atEnd) => {
            for (const { node, start } of nodes) {
                const end = start + node.nodeValue.length;
                if (atEnd ? (offset > start && offset <= end) : (offset >= start && offset < end)) return [node, offset - start];
            }
            return null;
        };
        const from = locate(m.index, false), to = locate(m.index + m[0].length, true);
        if (!from || !to) continue;
        const range = document.createRange();
        range.setStart(from[0], from[1]);
        range.setEnd(to[0], to[1]);
        const a = document.createElement("a");
        a.href = "#";
        a.className = "quote-jump";
        a.dataset.quote = (m[1] || m[2] || m[3]).replace(/\s+/g, " ").trim();
        a.title = "Mostra-la a la pàgina";
        a.appendChild(range.extractContents());
        range.insertNode(a);
    }
}

/**
 * Amaga el que penja del resultat acabat de generar (procedència, avís de
 * model): en canviar la vista (historial, entrada desada, text enviat) deixaria de
 * correspondre a allò que es veu.
 */
function resetResultChrome() {
    hideProvenance();
    const notice = document.getElementById("model-notice");
    if (notice) { notice.textContent = ""; notice.classList.add("hidden"); }
}

function hideProvenance() {
    const el = document.getElementById("provenance");
    if (el) el.classList.add("hidden");
}

/**
 * Renders the API key missing warning screen with configuration buttons.
 */
function renderApiKeyWarning(contentDiv) {
    const modelSelect = document.getElementById("model-select");
    const opt = document.createElement("option");
    opt.textContent = "Falta la clau d'API";
    modelSelect.replaceChildren(opt);
    modelSelect.disabled = true;
    modelSelect.classList.add("error-state");

    // Build API key warning with safe DOM manipulation
    const warningContainer = document.createElement("div");
    warningContainer.className = "api-key-warning-container";

    const iconWrapper = document.createElement("div");
    iconWrapper.style.marginBottom = "12px";
    const lockSvg = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="api-key-icon" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>', 'image/svg+xml').documentElement;
    iconWrapper.appendChild(lockSvg);

    const title = document.createElement("h2");
    title.className = "api-key-title";
    title.textContent = "Connecta Resumir amb Gemini";
    iconWrapper.appendChild(title);

    // Tres passos, tot dins del panell (sense enviar l'usuari a una pestanya nova)
    const steps = document.createElement("ol");
    steps.className = "api-key-steps";

    const step1 = document.createElement("li");
    step1.append("Obté una clau gratuïta a ");
    const ctaLink = document.createElement("a");
    ctaLink.id = "getApiKeyLink";
    ctaLink.href = "#";
    ctaLink.className = "api-key-cta-link";
    ctaLink.textContent = "Google AI Studio";
    step1.appendChild(ctaLink);
    step1.append(".");

    const step2 = document.createElement("li");
    step2.append("Enganxa-la aquí:");
    const keyRow = document.createElement("div");
    keyRow.className = "api-key-row";
    const keyInput = document.createElement("input");
    keyInput.type = "password";
    keyInput.id = "apiKeyInput";
    keyInput.className = "api-key-input";
    keyInput.autocomplete = "off";
    keyInput.spellcheck = false;
    keyInput.placeholder = "AIza…";
    if (typeof hardenSecretInput === "function") hardenSecretInput(keyInput);
    keyInput.setAttribute("aria-label", "Clau d'API de Gemini");
    keyInput.setAttribute("aria-describedby", "apiKeyStatus apiKeyPrivacy");
    const showBtn = document.createElement("button");
    showBtn.type = "button";
    showBtn.className = "api-key-show";
    showBtn.textContent = "Mostrar";
    showBtn.setAttribute("aria-pressed", "false");
    showBtn.setAttribute("aria-label", "Mostrar la clau");
    showBtn.addEventListener("click", () => {
        const show = toggleSecretInput(keyInput);
        showBtn.textContent = show ? "Amagar" : "Mostrar";
        showBtn.setAttribute("aria-pressed", String(show));
        showBtn.setAttribute("aria-label", show ? "Amagar la clau" : "Mostrar la clau");
    });
    keyRow.append(keyInput, showBtn);
    step2.appendChild(keyRow);

    const step3 = document.createElement("li");
    step3.append("Comprova-la i comença a resumir.");

    steps.append(step1, step2, step3);

    const status = document.createElement("p");
    status.id = "apiKeyStatus";
    status.className = "api-key-status";
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const verifyBtn = document.createElement("button");
    verifyBtn.type = "button";
    verifyBtn.id = "verifyApiKeyBtn";
    verifyBtn.className = "btn-primary api-key-btn-primary";
    verifyBtn.textContent = "Comprovar i desar";

    const privacy = document.createElement("p");
    privacy.id = "apiKeyPrivacy";
    privacy.className = "api-key-privacy";
    privacy.textContent = "La clau es desa només en aquest navegador. El text de les pàgines que resumeixes s'envia a Google Gemini; amb la clau gratuïta, Google pot fer servir el contingut per millorar els seus models.";

    const advanced = document.createElement("button");
    advanced.type = "button";
    advanced.id = "configApiKeyBtn";
    advanced.className = "api-key-advanced";
    advanced.textContent = "Obrir la configuració";

    warningContainer.append(iconWrapper, steps, status, verifyBtn, privacy, advanced);

    contentDiv.replaceChildren(warningContainer);
    contentDiv.classList.remove("hidden");

    ctaLink.addEventListener("click", (e) => {
        e.preventDefault();
        ext.tabs.create({ url: "https://aistudio.google.com/app/apikey" });
    });
    advanced.addEventListener("click", () => ext.runtime.openOptionsPage());

    async function submit() {
        const raw = keyInput.value;
        if (!normalizeApiKey(raw)) {
            status.textContent = "Enganxa primer la clau.";
            keyInput.focus();
            return;
        }
        verifyBtn.disabled = true;
        status.textContent = "Comprovant…";
        const result = await verifyApiKey(raw);
        if (!result.ok) {
            status.textContent = result.message;
            verifyBtn.disabled = false;
            keyInput.focus();
            return;
        }
        status.textContent = looksLikeGeminiKey(result.key)
            ? "Clau vàlida. Desant…"
            : "Clau acceptada. Desant…";
        // Desar-la dispara la recàrrega de la barra (storage.onChanged) i ja es pot resumir
        await ext.storage.local.set({ apiKey: result.key });
    }
    verifyBtn.addEventListener("click", submit);
    keyInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { setErrorMessage, resetResultChrome, linkQuotes, linkYoutubeTimes, youtubeVideoId, linkPdfPages, renderProvenance, looksLikeCookieBanner, hideProvenance, formatTextToFragment, formatBionicText, setGeneratingState, resetUI, startGenerationTimer, stopGenerationTimer, announceStatus, setLoadingStage, openSettings, applyExtensionOrder, applyExtensionVisibility, TOOLBAR_GROUPS };
}
