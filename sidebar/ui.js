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

    const isDeepDiveEnabled = config.enableDeepdive === true || config.enableDeepDive === true;

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
}

/**
 * Applies the user-defined order to the extension buttons
 */
function applyExtensionOrder(order) {
    if (!order || !Array.isArray(order) || order.length === 0) return;

    const toolbar = document.querySelector(".toolbar");
    if (!toolbar) return;

    const summarizeBtnEl = document.getElementById("summarizeBtn");
    const settingsBtnEl = document.getElementById("settingsBtn");
    
    const extensionIdToButtonId = {
        "obsidian": "obsidianBtn",
        "markdown": "copyBtn",
        "deepdive": "deepDiveBtn",
        "bionic": "bionicBtn"
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

    // Ensure summarizeBtn is first
    if (summarizeBtnEl && summarizeBtnEl.parentNode === toolbar) {
        toolbar.insertBefore(summarizeBtnEl, toolbar.firstChild);
    }
    
    // Insert ordered extension buttons after summarizeBtn
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

/**
 * Sets the UI state depending on whether a summary is being generated or not
 */
function setGeneratingState(generating, hasContent = false) {
    const summarizeBtn = document.getElementById("summarizeBtn");
    const loadingDiv = document.getElementById("loading");
    const copyBtn = document.getElementById("copyBtn");

    if (generating) {
        summarizeBtn.replaceChildren(getIcon(PAUSE_ICON_STR));
        summarizeBtn.classList.add("stop-btn");
        summarizeBtn.classList.remove("primary");
        summarizeBtn.title = "Aturar Generació";
        
        copyBtn.disabled = true;
        document.getElementById("obsidianBtn").disabled = true;
        document.getElementById("bionicBtn").disabled = true;
        document.getElementById("deepDiveBtn").disabled = true;
        
        loadingDiv.classList.remove("hidden");
    } else {
        summarizeBtn.replaceChildren(getIcon(PLAY_ICON_STR));
        summarizeBtn.classList.remove("stop-btn");
        summarizeBtn.classList.add("primary");
        summarizeBtn.title = "Resumir Pàgina";
        
        loadingDiv.classList.add("hidden");
        stopGenerationTimer();
        
        copyBtn.disabled = !hasContent;
        document.getElementById("obsidianBtn").disabled = !hasContent;
        document.getElementById("bionicBtn").disabled = !hasContent;
        document.getElementById("deepDiveBtn").disabled = !hasContent;
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
    if (bionicBtn) bionicBtn.disabled = !hasContent;
    const deepDiveBtn = document.getElementById("deepDiveBtn");
    if (deepDiveBtn) deepDiveBtn.disabled = !hasContent;
    
    if (config) {
        applyExtensionVisibility(config);
        if (config.extensionOrder) {
            applyExtensionOrder(config.extensionOrder);
        }
    } else {
        ext.storage.sync
            .get(["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableDeepDive", "extensionOrder"])
            .then(fetchedConfig => {
                applyExtensionVisibility(fetchedConfig);
                if (fetchedConfig.extensionOrder) {
                    applyExtensionOrder(fetchedConfig.extensionOrder);
                }
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

    const formatInline = (textStr) => {
        const span = document.createElement('span');
        const parts = textStr.split(/\*\*(.*?)\*\*/g);
        parts.forEach((part, index) => {
            if (index % 2 === 1) { // Bold (Already Markdown Bold)
                const strong = document.createElement('strong');
                strong.textContent = part;
                span.appendChild(strong);
            } else if (part) {
                if (bionic) {
                    span.appendChild(formatBionicText(part, fixation));
                } else {
                    span.appendChild(document.createTextNode(part));
                }
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

function updateTokenStats(sent, received) {
    const sentEl = document.getElementById("quota-count");
    const receivedEl = document.getElementById("quota-reset");
    
    sentEl.textContent = `Enviats: ${sent}`;
    sentEl.style.color = "";
    receivedEl.textContent = `Rebuts: ${received}`;
    receivedEl.style.color = "";

    const footer = document.getElementById("footer-status");
    footer.classList.remove("hidden");
}

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

let countdownInterval = null;

async function startCountdown(seconds) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    const unblockTime = Date.now() + (seconds * 1000);
    await ext.storage.local.set({ blockedUntil: unblockTime });
    
    runCountdownTimer(unblockTime);
}

function runCountdownTimer(unblockTime) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    const footer = document.getElementById("footer-status");
    footer.classList.remove("hidden");
    
    const updateTimer = () => {
        const now = Date.now();
        const remainingMs = unblockTime - now;
        const remainingSec = Math.ceil(remainingMs / 1000);
        
        const resetEl = document.getElementById("quota-reset");
        const countEl = document.getElementById("quota-count");

        if (remainingSec <= 0) {
            clearInterval(countdownInterval);
            ext.storage.local.remove("blockedUntil");
            
            countEl.textContent = "Reintenta-ho"; 
            countEl.style.color = "#28a745"; 
        } else {
            countEl.textContent = "Límit assolit";
            countEl.style.color = "#d70022";
            
            resetEl.textContent = `Espera: ${remainingSec}s`;
            resetEl.style.color = "#d70022";
            resetEl.style.fontWeight = "bold";
        }
    };
    
    updateTimer(); 
    countdownInterval = setInterval(updateTimer, 1000);
}
