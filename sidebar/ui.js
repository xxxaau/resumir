/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/ui.js
// Handles UI updates, timers, formatting, and DOM manipulation

const PLAY_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
const PAUSE_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
const CHECK_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="#28a745"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

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
        copyBtn.style.display = config.enableMarkdown ? "flex" : "none";
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

}

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

    // Insert ordered extension buttons before settingsBtn
    orderedButtons.forEach(btn => {
        if (btn.parentNode === toolbar) {
            const insertBefore = settingsBtnEl || null;
            toolbar.insertBefore(btn, insertBefore);
        }
    });

    // Ensure settingsBtn is last
    if (settingsBtnEl && settingsBtnEl.parentNode === toolbar) {
        toolbar.appendChild(settingsBtnEl);
    }
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
            activeBtn.replaceChildren(getIcon(PAUSE_ICON_STR));
            activeBtn.classList.add("stop-btn");
            if (currentActiveBtnId === "summarizeBtn") {
                activeBtn.classList.remove("primary");
            }
            activeBtn.dataset.originalTitle = activeBtn.title || "";
            activeBtn.title = "Aturar Generació";
        }
        
        const allActionBtns = ["summarizeBtn", "deepDiveBtn", "scienceBtn", "copyBtn", "obsidianBtn", "conceptMapBtn", "explainSimpleBtn", "selectPdfBtn"];
        for (const btnId of allActionBtns) {
            if (btnId !== currentActiveBtnId) {
                const btn = document.getElementById(btnId);
                if (btn) btn.disabled = true;
            }
        }
        
        loadingDiv.classList.remove("hidden");
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

        if (summarizeBtn) summarizeBtn.disabled = false;
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

    if (config) {
        applyExtensionVisibility(config);
        applyExtensionOrder(config.extensionOrder || DEFAULT_EXTENSION_ORDER);
    } else {
        ext.storage.sync
            .get(["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableScience", "enableSimple", "enablePdf", "extensionOrder"])
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
    
    let currentList = null;

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

    const formatInline = (textStr) => {
        const span = document.createElement('span');
        const parts = textStr.split(/\*\*(.*?)\*\*/g);
        parts.forEach((part, index) => {
            if (index % 2 === 1) { // Bold
                const strong = document.createElement('strong');
                strong.textContent = part;
                span.appendChild(strong);
            } else if (part) {
                span.appendChild(parseTextWithLinks(part));
            }
        });
        return span;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();

        if (trimmed === "") {
            if (currentList) {
                fragment.appendChild(currentList);
                currentList = null;
            }
            continue;
        }

        // Headers
        const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headerMatch) {
            if (currentList) {
                fragment.appendChild(currentList);
                currentList = null;
            }
            const level = headerMatch[1].length;
            const content = headerMatch[2];
            const h = document.createElement(`h${level}`);
            h.appendChild(formatInline(content));
            fragment.appendChild(h);
            continue;
        }

        // List Items
        const listMatch = line.match(/^(\*|-)\s+(.*)/);
        if (listMatch) {
            if (!currentList) {
                currentList = document.createElement('ul');
            }
            const li = document.createElement('li');
            li.appendChild(formatInline(listMatch[2]));
            currentList.appendChild(li);
            continue;
        }

        // Regular Paragraph
        if (currentList) {
            fragment.appendChild(currentList);
            currentList = null;
        }
        
        const p = document.createElement('p');
        p.appendChild(formatInline(line));
        fragment.appendChild(p);
    }
    
    if (currentList) {
        fragment.appendChild(currentList);
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
    timerEl.style.color = "#666";
    
    generationStartTime = Date.now();
    
    generationInterval = setInterval(() => {
        const elapsed = (Date.now() - generationStartTime) / 1000;
        timerEl.textContent = elapsed.toFixed(1) + "s";
    }, 100);

    return generationStartTime;
}

function stopGenerationTimer() {
    if (generationInterval) clearInterval(generationInterval);
    generationInterval = null;

    const timerEl = document.getElementById("generation-timer");
    if (timerEl) {
        timerEl.style.color = "#28a745";
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
        tokensInCount.textContent = inputTokens > 0 ? formatTokenCount(inputTokens) : "-";
    }

    if (tokensOutCount) {
        tokensOutCount.textContent = outputTokens > 0 ? formatTokenCount(outputTokens) : "-";
    }

    if (tokensIn) {
        const prefix = inputEstimated ? "Estimacio: " : "";
        tokensIn.title = `${prefix}${formatTokenTooltipCount(inputTokens)} tokens enviats`;
    }

    if (tokensOut) {
        const prefix = outputEstimated ? "Estimacio: " : "";
        tokensOut.title = `${prefix}${formatTokenTooltipCount(outputTokens)} tokens rebuts`;
    }
}

/**
 * Renders the API key missing warning screen with configuration buttons.
 */
function renderApiKeyWarning(contentDiv) {
    const modelSelect = document.getElementById("model-select");
    const opt = document.createElement("option");
    opt.textContent = "Falta API Key";
    modelSelect.replaceChildren(opt);
    modelSelect.disabled = true;
    modelSelect.classList.add("error-state");

    // Build API key warning with safe DOM manipulation
    const warningContainer = document.createElement("div");
    warningContainer.className = "api-key-warning-container";

    const iconWrapper = document.createElement("div");
    iconWrapper.style.marginBottom = "25px";
    const lockSvg = new DOMParser().parseFromString('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="api-key-icon"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>', 'image/svg+xml').documentElement;
    iconWrapper.appendChild(lockSvg);

    const title = document.createElement("p");
    title.className = "api-key-title";
    title.textContent = "Falta configurar l'API Key";

    const desc = document.createElement("p");
    desc.className = "api-key-desc";
    desc.textContent = "Necessària per connectar amb Google Gemini.";

    iconWrapper.appendChild(title);
    iconWrapper.appendChild(desc);

    const configBtn = document.createElement("button");
    configBtn.id = "configApiKeyBtn";
    configBtn.className = "primary api-key-btn-primary";
    configBtn.textContent = "Configurar Ara";

    const ctaFooter = document.createElement("div");
    ctaFooter.className = "api-key-cta-footer";

    const ctaText = document.createElement("span");
    ctaText.className = "api-key-cta-text";
    ctaText.textContent = "Encara no en tens?";

    const ctaLink = document.createElement("a");
    ctaLink.id = "getApiKeyLink";
    ctaLink.href = "#";
    ctaLink.className = "api-key-cta-link";
    ctaLink.textContent = "Obtenir API Key gratuïta →";

    ctaFooter.appendChild(ctaText);
    ctaFooter.appendChild(ctaLink);

    warningContainer.appendChild(iconWrapper);
    warningContainer.appendChild(configBtn);
    warningContainer.appendChild(ctaFooter);

    contentDiv.replaceChildren(warningContainer);
    contentDiv.classList.remove("hidden");
    
    document.getElementById("configApiKeyBtn").addEventListener("click", () => {
        ext.runtime.openOptionsPage();
    });

    document.getElementById("getApiKeyLink").addEventListener("click", (e) => {
        e.preventDefault();
        ext.tabs.create({ url: "https://aistudio.google.com/app/apikey" });
    });
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { formatTextToFragment, formatBionicText };
}
