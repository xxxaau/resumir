/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

document.addEventListener("DOMContentLoaded", () => {
    const contentDiv = document.getElementById("content");
    const errorDiv = document.getElementById("error");
    const summarizeBtn = document.getElementById("summarizeBtn");
    const copyBtn = document.getElementById("copyBtn");
    const settingsBtn = document.getElementById("settingsBtn");
    const obsidianBtn = document.getElementById("obsidianBtn");
    const bionicBtn = document.getElementById("bionicBtn");
    const deepDiveBtn = document.getElementById("deepDiveBtn");
    const scienceBtn = document.getElementById("scienceBtn");
    const explainSimpleBtn = document.getElementById("explainSimpleBtn");
    const historyBtn = document.getElementById("historyBtn");
    const sourceTextBtn = document.getElementById("sourceTextBtn");
    const selectPdfBtn = document.getElementById("selectPdfBtn");
    const pdfFileInput = document.getElementById("pdfFileInput");
    const modelSelect = document.getElementById("model-select");

    let isGenerating = false;
    let abortController = null;
    let currentMetadata = { title: "", url: "", summary: "", fromCache: false };
    let currentSourceText = "";
    let contentPreload = null;
    let isBionicEnabled = false;
    let globalConfigCache = {};

    function showPageTitleStrip(title, url) {
        const strip = document.getElementById("page-title-strip");
        const link  = document.getElementById("page-title-link");
        if (!strip || !link) return;
        link.textContent = title || url;
        try { link.href = ["http:", "https:"].includes(new URL(url).protocol) ? url : "#"; } catch { link.href = "#"; }
        strip.classList.remove("hidden");
    }

    function updateSourceBtn() {
        if (sourceTextBtn) sourceTextBtn.disabled = !currentSourceText;
    }

    // --- Context object for summary.js ---
    const ctx = {
        contentDiv,
        errorDiv,
        modelSelect,
        currentMetadata,
        getSourceText: () => currentSourceText,
        setSourceText: (t) => { currentSourceText = t; updateSourceBtn(); },
        getContentPreload: () => contentPreload,
        isBionicEnabled: () => isBionicEnabled,
        getGlobalConfig: () => globalConfigCache,
        onPageIdentified: (title, url) => showPageTitleStrip(title, url)
    };

    // Bound summary starter (partially applied with ctx)
    const doSummary = (overrideText, isDeepDive, isScience, isUserInitiated, isConceptMap, isSimple) => {
        if (isGenerating && abortController) {
            abortController.abort();
            abortController = null;
            isGenerating = false;
            setGeneratingState(false, !!currentMetadata.summary);
            return;
        }
        isGenerating = true;
        startSummary(ctx, overrideText, isDeepDive, isScience, isUserInitiated, isConceptMap, isSimple).then(ctrl => {
            abortController = ctrl;
        }).finally(() => {
            isGenerating = false;
            abortController = null;
            if (currentMetadata.url) updateCacheBadge(currentMetadata.url);
        });
    };

    // --- Configuration Initialization & Migration ---

    const CONFIG_KEYS = ["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableScience", "enableResum", "enableConceptMap", "enableSimple", "enablePdf", "extensionOrder", "markdownTemplate", "obsidianVault", "obsidianPath", "obsidianTemplate", "bionicFont", "bionicWeight", "bionicFontSize", "bionicLineHeight", "bionicFixation"];

    ext.storage.sync
      .get(CONFIG_KEYS)
      .then(config => {
          globalConfigCache = config;
          applyExtensionVisibility(config);
          applyExtensionOrder(config.extensionOrder || DEFAULT_EXTENSION_ORDER);
          resetUI(false, config);
      })
      .catch(e => console.error("Error loading initial visibility config:", e));

    ext.storage.onChanged.addListener((changes, area) => {
        if (area === 'local' && changes.apiKey && changes.apiKey.newValue !== changes.apiKey.oldValue) {
            window.location.reload();
        }
        if (area === 'sync') {
            if (changes.modelName) {
                const newModel = changes.modelName.newValue;
                if (globalConfigCache) {
                    globalConfigCache.modelName = newModel;
                }
                if (modelSelect && newModel && modelSelect.value !== newModel) {
                    if (Array.from(modelSelect.options).some(o => o.value === newModel)) {
                        modelSelect.value = newModel;
                    } else {
                        loadModels(null, newModel);
                    }
                }
            }
            // Recarregar el select si els favorits canvien des de settings
            if (changes.favoriteModels) {
                const currentVal = modelSelect.value;
                loadModels(null, currentVal);
            }
            const configChanged = CONFIG_KEYS.some(key => changes[key]);
            if (configChanged) {
                ext.storage.sync.get(CONFIG_KEYS).then(config => {
                    globalConfigCache = config;
                    applyExtensionVisibility(config);
                    if (config.extensionOrder) {
                        applyExtensionOrder(config.extensionOrder);
                    }
                    if (changes.bionicFont || changes.bionicWeight || changes.bionicFontSize || changes.bionicLineHeight || changes.bionicFixation) {
                        if (!isBionicEnabled) {
                            isBionicEnabled = true;
                            if (bionicBtn) {
                                bionicBtn.classList.add("active");
                                bionicBtn.setAttribute("aria-pressed", "true");
                            }
                        }
                        applyBionicToContent(config);
                    }
                });
            }
        }
    });

    // --- Button Event Listeners ---

    summarizeBtn.addEventListener("click", () => {
        doSummary(null, false, false, true);
    });

    // --- Selector de PDF local ---
    // Flux: l'usuari selecciona un PDF, l'extreim amb pdf.js, l'obrim en una
    // pestanya nova (blob URL) i disparem el resum. contentPreload conte el
    // text ja extret, indexat per la URL blob de la nova pestanya, de manera
    // que el pipeline normal el consumeix sense haver de re-fetch-ar.
    if (selectPdfBtn && pdfFileInput) {
        // Pulsa el bot\u00f3 quan apareix l'error PDF-016 a l'errorDiv per fer-lo descobrible.
        if (errorDiv && typeof MutationObserver !== "undefined") {
            const obs = new MutationObserver(() => {
                if (errorDiv.textContent && errorDiv.textContent.includes("[PDF-016]")) {
                    selectPdfBtn.classList.add("pulse");
                    setTimeout(() => selectPdfBtn.classList.remove("pulse"), 4000);
                }
            });
            obs.observe(errorDiv, { childList: true, characterData: true, subtree: true });
        }
        selectPdfBtn.addEventListener("click", () => {
            if (isGenerating) return;
            pdfFileInput.click();
        });
        pdfFileInput.addEventListener("change", async (e) => {
            const file = e.target.files && e.target.files[0];
            // Reset perqu\u00e8 re-seleccionar el mateix fitxer torni a disparar change.
            e.target.value = "";
            if (!file) return;
            if (isGenerating) return;
            try {
                showPageTitleStrip(file.name, `pdf-local:${file.name}`);
                const buffer = await file.arrayBuffer();
                // Clonar el buffer abans de passar-lo a extractPdfText: pdf.js el pot
                // transferir al worker (via postMessage) i detachar l'original.
                const viewerBuffer = buffer.slice(0);
                if (typeof extractPdfText !== "function") {
                    throw new Error("pdf-extract no carregat (vendor/pdf.min.js)");
                }
                const pdfResult = await extractPdfText(buffer);
                // Obre el PDF en una pestanya per consultar-lo via visor personalitzat.
                // Usem storage.session (compartit entre pàgines d'extensió) per passar
                // el buffer, ja que blob: URLs no funcionen al visor nadiu de Firefox.
                let viewerKey = `pdfViewer:${Date.now()}`;
                const b64 = arrayBufferToBase64(viewerBuffer);
                try {
                    await ext.storage.session.set({ [viewerKey]: b64 });
                } catch (sessionErr) {
                    console.warn("[PDF picker] storage.session.set failed, skipping viewer:", sessionErr);
                    // Si storage.session no pot desar-lo (límit de mida), simplement no
                    // obrim el visor. El resum es genera igualment.
                    viewerKey = null;
                }
                if (viewerKey) {
                    ext.tabs.create({
                        url: ext.runtime.getURL(`sidebar/pdf-viewer.html?key=${encodeURIComponent(viewerKey)}`),
                        active: true
                    });
                }
                const tabUrl = `pdf-local:${file.name}`;
                const pageData = {
                    title: pdfResult.title || file.name,
                    text: pdfResult.text,
                    url: tabUrl,
                };
                // Injecta el contingut al pipeline normal de resum.
                // summary.js comprovara si el URL comenca per "pdf-local:" i usara
                // el preload directament (sense necessitat que coincideixi amb la pestanya activa).
                contentPreload = Promise.resolve(pageData);
                doSummary(null, false, false, true);
            } catch (err) {
                console.error("[PDF picker] error:", err);
                const codeMap = {
                    PASSWORD: "[PDF-010] PDF protegit amb contrasenya. No es pot resumir.",
                    INVALID: "[PDF-011] El fitxer no és un PDF vàlid o està corromput.",
                    SCANNED: "[PDF-012] PDF escanejat sense capa de text. OCR no suportat encara.",
                    TOO_LARGE: "[PDF-013] PDF massa gran.",
                    TIMEOUT: "[PDF-014] S'ha esgotat el temps en extreure el PDF.",
                };
                const msg = codeMap[err?.code] || `[PDF-019] Error obrint PDF: ${err?.message || err}`;
                if (errorDiv) {
                    errorDiv.textContent = msg;
                    errorDiv.classList.remove("hidden");
                }
            }
        });
    }

    // Open links in content area in a new browser tab (extension sidebar context)
    contentDiv.addEventListener("click", (e) => {
        const anchor = e.target.closest("a[href]");
        if (anchor) {
            e.preventDefault();
            try {
                const parsed = new URL(anchor.href);
                if (["http:", "https:"].includes(parsed.protocol)) ext.tabs.create({ url: anchor.href });
            } catch { /* invalid URL — ignore */ }
        }
    });

    copyBtn.addEventListener("click", async () => {
        if (!currentMetadata.summary) return;
        try {
            const template = globalConfigCache.markdownTemplate || "# [{{title}}]({{url}})\n\n{{summary}}";
            const markdown = formatMarkdownContent(template, currentMetadata);
            await navigator.clipboard.writeText(markdown);
            
            const originalChild = copyBtn.firstElementChild.cloneNode(true);
            copyBtn.replaceChildren(getIcon(CHECK_ICON_STR));
            setTimeout(() => { copyBtn.replaceChildren(originalChild); }, 1500);
        } catch (err) {
            console.error("Error copiant:", err);
            errorDiv.textContent = "Error copiant al porta-retalls.";
            errorDiv.classList.remove("hidden");
        }
    });

    obsidianBtn.addEventListener("click", async () => {
        if (!currentMetadata.summary) return;
        try {
            const vault = globalConfigCache.obsidianVault || "Obsidian";
            const pathTemplate = globalConfigCache.obsidianPath || "[4 Arxiu/Notes/]YYYY/gggg-[W]ww";
            const contentTemplate = globalConfigCache.obsidianTemplate || "- [{{title}}]({{url}})\n\t- {{summary_executive}}";

            if (!vault) {
                const confirmConfig = confirm("Obsidian no està configurat. Vols obrir la configuració?");
                if (confirmConfig) ext.runtime.openOptionsPage();
                return;
            }

            const filePath = parseObsidianPath(pathTemplate);
            const content = formatObsidianContent(contentTemplate, currentMetadata);
            const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(content.trim())}&append=true`;

            try {
                const tab = await ext.tabs.create({ url: uri, active: false });
                setTimeout(() => ext.tabs.remove(tab.id).catch(() => {}), 5000);
            } catch (err) {
                console.error("Obsidian protocol failed:", err);
                errorDiv.textContent = "Error obrint Obsidian: " + err.message;
                errorDiv.classList.remove("hidden");
            }
            
            const originalChild = obsidianBtn.firstElementChild.cloneNode(true);
            obsidianBtn.replaceChildren(getIcon(CHECK_ICON_STR));
            setTimeout(() => obsidianBtn.replaceChildren(originalChild), 1500);

        } catch (e) {
            console.error("Error Obsidian:", e);
            errorDiv.textContent = "Error: " + e.message;
            errorDiv.classList.remove("hidden");
        }
    });

    function applyBionicToContent(config) {
        const cfg = config || globalConfigCache;
        contentDiv.style.fontFamily = cfg.bionicFont || DEFAULT_BIONIC.font;
        contentDiv.style.fontSize = cfg.bionicFontSize || DEFAULT_BIONIC.fontSize;
        contentDiv.style.lineHeight = cfg.bionicLineHeight || DEFAULT_BIONIC.lineHeight;
        contentDiv.style.setProperty("--bionic-weight", cfg.bionicWeight || DEFAULT_BIONIC.weight);
        const fixation = (cfg.bionicFixation || DEFAULT_BIONIC.fixation) / 100;
        if (currentMetadata.summary) {
            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, true, fixation));
        }
    }

    bionicBtn.addEventListener("click", async () => {
        isBionicEnabled = !isBionicEnabled;
        ext.storage.local.set({ isBionicActive: isBionicEnabled });
        if (isBionicEnabled) {
            bionicBtn.classList.add("active");
            bionicBtn.setAttribute("aria-pressed", "true");
            applyBionicToContent();
        } else {
            bionicBtn.classList.remove("active");
            bionicBtn.setAttribute("aria-pressed", "false");
            contentDiv.style.fontFamily = "";
            contentDiv.style.fontSize = "";
            contentDiv.style.lineHeight = "";
            if (currentMetadata.summary) {
               contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, false));
            }
        }
    });

    // --- Prompt Update Notification ---
    const promptUpdateBanner = document.getElementById("prompt-update-notification");
    const promptUpdateText = document.getElementById("prompt-update-text");
    const promptUpdateLink = document.getElementById("prompt-update-link");
    const promptUpdateDismiss = document.getElementById("prompt-update-dismiss");

    let _currentUpdateKey = null;
    let _currentCallback = null;

    function showPromptUpdateBanner(type, updateKey, callback) {
        if (!promptUpdateBanner || !promptUpdateText || !promptUpdateLink) return;
        _currentUpdateKey = updateKey;
        _currentCallback = callback;
        promptUpdateText.textContent = `Nova versió del prompt de ${type} disponible. `;
        promptUpdateLink.onclick = (e) => {
            e.preventDefault();
            ext.storage.sync.set({ [updateKey]: false }).catch(() => {});
            promptUpdateBanner.classList.add("hidden");
            ext.runtime.openOptionsPage();
        };
        promptUpdateBanner.classList.remove("hidden");
    }

    function dismissAndContinue() {
        if (!promptUpdateBanner) { if (_currentCallback) _currentCallback(); return; }
        promptUpdateBanner.classList.add("hidden");
        if (_currentUpdateKey) {
            ext.storage.sync.set({ [_currentUpdateKey]: false }).catch(() => {});
        }
        const cb = _currentCallback;
        _currentUpdateKey = null;
        _currentCallback = null;
        if (cb) cb();
    }

    function checkPromptUpdate(type, updateKey, callback) {
        if (!promptUpdateBanner) { callback(); return; }
        ext.storage.sync.get(updateKey).then(result => {
            if (result[updateKey]) {
                showPromptUpdateBanner(type, updateKey, callback);
            } else {
                callback();
            }
        }).catch(() => callback());
    }

    if (promptUpdateDismiss) {
        promptUpdateDismiss.addEventListener("click", dismissAndContinue);
    }

    deepDiveBtn.addEventListener("click", () => {
        checkPromptUpdate("aprofundiment", "deepDivePromptUpdateAvailable", () => {
            doSummary(null, true, false, true);
        });
    });

    scienceBtn.addEventListener("click", () => {
        checkPromptUpdate("validació científica", "sciencePromptUpdateAvailable", () => {
            doSummary(null, false, true, true);
        });
    });

    const conceptMapBtn = document.getElementById("conceptMapBtn");
    if (conceptMapBtn) {
        conceptMapBtn.addEventListener("click", () => {
            checkPromptUpdate("mapa conceptual", "conceptMapPromptUpdateAvailable", () => {
                doSummary(null, false, false, true, true);
            });
        });
    }

    if (explainSimpleBtn) {
        explainSimpleBtn.addEventListener("click", () => {
            checkPromptUpdate("explicació planera", "simplePromptUpdateAvailable", () => {
                doSummary(null, false, false, true, false, true);
            });
        });
    }

    if (historyBtn) historyBtn.addEventListener("click", () => {
        const historyPanel = document.getElementById("history-panel");
        if (historyPanel && !historyPanel.classList.contains("hidden")) {
            // Panel obert → tancar-lo
            closeHistoryPanel();
        } else {
            // Panel tancat → obrir-lo
            openHistoryPanel();
        }
    });
    if (sourceTextBtn) sourceTextBtn.addEventListener("click", () => {
        if (!currentSourceText) return;
        const sourcePanel = document.getElementById("source-panel");
        if (sourcePanel && !sourcePanel.classList.contains("hidden")) {
            // Panel obert → tancar-lo
            closeSourcePanel();
        } else {
            // Panel tancat → obrir-lo
            openSourcePanel(currentSourceText);
        }
    });
    const historyBackBtn = document.getElementById("historyBackBtn");
    if (historyBackBtn) historyBackBtn.addEventListener("click", openHistoryPanel);

    let cacheBadgeTimer = null;
    function updateCacheBadge(url) {
        clearTimeout(cacheBadgeTimer);
        cacheBadgeTimer = setTimeout(async () => {
            const badge = document.getElementById("cache-badge");
            if (!badge) return;
            if (!url || url.startsWith("seleccio:")) {
                badge.style.visibility = "hidden";
                badge.replaceChildren();
                badge.removeAttribute("data-clickable");
                badge.removeAttribute("data-types");
                return;
            }
            const types = await getAvailableTypes(url);
            if (types.length > 0) {
                badge.replaceChildren();
                for (const ct of CONTENT_TYPES) {
                    if (types.includes(ct.id)) {
                        const icon = document.createElement("span");
                        icon.className = "cache-badge-type";
                        icon.textContent = ct.icon;
                        icon.title = ct.label;
                        icon.dataset.type = ct.id;
                        badge.appendChild(icon);
                    }
                }
                badge.style.visibility = "visible";
                badge.dataset.clickable = "true";
                badge.dataset.types = types.join(",");
            } else {
                badge.replaceChildren();
                badge.style.visibility = "hidden";
                badge.removeAttribute("data-clickable");
                badge.removeAttribute("data-types");
            }
        }, 150);
    }

    const cacheBadge = document.getElementById("cache-badge");
    if (cacheBadge) {
        cacheBadge.addEventListener("click", async (e) => {
            if (cacheBadge.dataset.clickable !== "true") return;
            const tabs = await ext.tabs.query({ active: true, currentWindow: true });
            if (!tabs[0]?.url) return;
            const url = tabs[0].url;
            const typeIcon = e.target.closest(".cache-badge-type");
            if (typeIcon) {
                const entry = await getSummaryCache(url, typeIcon.dataset.type);
                if (entry) loadHistoryEntry(entry);
            } else {
                const types = (cacheBadge.dataset.types || "").split(",").filter(Boolean);
                const preferred = types.includes("summary") ? "summary" : types[0];
                const entry = await getSummaryCache(url, preferred);
                if (entry) loadHistoryEntry(entry);
            }
        });
    }

    ext.tabs.onActivated.addListener(async (activeInfo) => {
        try {
            const tab = await ext.tabs.get(activeInfo.tabId);
            updateCacheBadge(tab.url);
        } catch (e) {}
    });

    ext.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo.url && tab.active) updateCacheBadge(tab.url);
    });

    settingsBtn.addEventListener("click", () => {
        ext.runtime.openOptionsPage();
    });

    modelSelect.addEventListener("change", async (e) => {
        if (e.target.value === "__open_settings__") {
            // Revertir al model anterior i obrir configuració
            const saved = await ext.storage.sync.get({ modelName: DEFAULT_MODEL_ID });
            modelSelect.value = saved.modelName;
            ext.runtime.openOptionsPage();
            return;
        }
        await ext.storage.sync.set({ modelName: e.target.value });
    });

    // --- Context Menu / Message Handling ---

    let lastTriggerTime = 0;
    
    const boundTrigger = (data) => {
        // Deduplicate triggers (prevent double summary if both message and storage events fire)
        const now = Date.now();
        if (now - lastTriggerTime < 500) return;
        lastTriggerTime = now;
        
        handleTrigger((text, dd, sc, ui) => doSummary(text, dd, sc, ui), data);
    };

    ext.runtime.onMessage.addListener((message, sender) => {
        if (sender.id !== ext.runtime.id) return;
        if (message.action === "trigger_summary") {
            boundTrigger(message.data);
        }
    });

    // Check for pending summary on load (context menu while sidebar was closed)
    ext.storage.local.get("pendingSummary").then(data => {
        if (data.pendingSummary) {
            ext.storage.local.remove("pendingSummary");
            boundTrigger(data.pendingSummary);
        }
    });

    function _handlePendingCacheLoad(value) {
        ext.storage.local.remove("pendingCacheLoad");
        let url = value;
        let type = "summary";
        if (typeof value === "string" && value.startsWith("{")) {
            try {
                const parsed = JSON.parse(value);
                if (parsed.url) { url = parsed.url; type = parsed.type || "summary"; }
            } catch {}
        }
        getSummaryCache(url, type).then(entry => {
            if (entry) loadHistoryEntry(entry);
        });
    }

    // Check for pending cache load on init (settings page wrote key while sidebar was closed)
    ext.storage.local.get("pendingCacheLoad").then(data => {
        if (data.pendingCacheLoad) {
            _handlePendingCacheLoad(data.pendingCacheLoad);
        }
    });

    // Watch for pendingSummary and pendingCacheLoad (reliable fallback for Chrome sidePanel timing)
    ext.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.pendingSummary && changes.pendingSummary.newValue) {
            ext.storage.local.remove("pendingSummary");
            boundTrigger(changes.pendingSummary.newValue);
        }
        if (area === "local" && changes.pendingCacheLoad?.newValue) {
            _handlePendingCacheLoad(changes.pendingCacheLoad.newValue);
        }
    });

    window.addEventListener('beforeunload', () => {
        if (abortController) abortController.abort();
        stopGenerationTimer();
    });

    // --- On Load Init ---
    (async () => {
        // 1. Migració de clau API: copy sync→local (només si cal)
        try {
            const local = await ext.storage.local.get(["apiKey", "apiKeyMigrated"]);
            if (!local.apiKeyMigrated) {
                const sync = await ext.storage.sync.get(["apiKey"]);
                if (sync.apiKey && !local.apiKey) {
                    await ext.storage.local.set({ apiKey: sync.apiKey, apiKeyMigrated: true });
                    // Esborrem de sync només si l'hem copiada (no si ja era a local)
                    await ext.storage.sync.remove("apiKey");
                } else {
                    // No hi ha clau per migrar o ja és a local — marquem com a fet
                    await ext.storage.local.set({ apiKeyMigrated: true });
                }
            }
        } catch (e) {
            console.warn("API key migration failed:", e);
        }

        // 2. Migració de prompts (versionat PER-PROMPT). La lògica és una funció
        //    pura a shared/defaults.js (computePromptMigration), testejada a
        //    tests/prompt-migration.test.mjs: només avisa els prompts que han
        //    canviat de versió I que l'usuari ha personalitzat.
        try {
            const promptDefs = [
                { key: "sciencePrompt", defaultVal: DEFAULT_SCIENCE_PROMPT, customizedKey: "sciencePromptCustomized", updateKey: "sciencePromptUpdateAvailable" },
                { key: "deepDivePrompt", defaultVal: DEFAULT_DEEP_DIVE_PROMPT, customizedKey: "deepDivePromptCustomized", updateKey: "deepDivePromptUpdateAvailable" },
                { key: "conceptMapPrompt", defaultVal: DEFAULT_CONCEPTMAP_PROMPT, customizedKey: "conceptMapPromptCustomized", updateKey: "conceptMapPromptUpdateAvailable" },
                { key: "simplePrompt", defaultVal: DEFAULT_SIMPLE_PROMPT, customizedKey: "simplePromptCustomized", updateKey: "simplePromptUpdateAvailable" },
            ];
            const promptKeys = [
                ...promptDefs.map(d => d.key),
                ...promptDefs.map(d => d.customizedKey),
                ...promptDefs.map(d => d.updateKey),
                "promptVersions", "promptDefaultsVersion",
            ];
            const promptConfig = await ext.storage.sync.get(promptKeys);
            const { toSet, toRemove } = computePromptMigration(promptConfig, promptDefs, PROMPT_VERSIONS);

            if (toRemove.length) await ext.storage.sync.remove(toRemove);
            if (Object.keys(toSet).length) await ext.storage.sync.set(toSet);
        } catch (e) {
            console.warn("Prompt migration failed:", e);
        }

        // Purgar caché expirada en segon pla (no bloquejant)
        purgeStaleCacheEntries().catch(err => { console.warn("Purge cache failed:", err); });
        // Inicialitzar badge de caché per a la URL del tab actiu
        ext.tabs.query({ active: true, currentWindow: true }).then(tabs => {
            if (tabs[0]?.url) updateCacheBadge(tabs[0].url);
        }).catch(() => {});
        try {
            const [syncData, localData] = await Promise.all([
                ext.storage.sync.get(["modelName"]),
                ext.storage.local.get(["apiKey", "blockedUntil", "isBionicActive"])
            ]);

            const apiKey = localData.apiKey;
            let modelName = syncData.modelName || DEFAULT_MODEL_ID;
            
            // Assegurar que el modelName es guarda si era per defecte (per a futures carregues)
            if (!syncData.modelName) {
                await ext.storage.sync.set({ modelName: DEFAULT_MODEL_ID });
            }
            
            if (localData.isBionicActive === true) {
                isBionicEnabled = true;
                if (bionicBtn) {
                    bionicBtn.classList.add("active");
                    bionicBtn.setAttribute("aria-pressed", "true");
                }
            }
            
            // Show footer immediately (model select always visible)
            const footer = document.getElementById("footer-status");
            if (footer) footer.classList.remove("hidden");
            
            contentPreload = Promise.race([
                getPageContent(),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Preload timeout")), 2000))
            ]).catch(() => null);

            // Neteja de la clau heretada `blockedUntil` (feature de bloqueig
            // temporal per quota, abandonada a favor del fallback de models).
            if (localData.blockedUntil) await ext.storage.local.remove("blockedUntil");

            if (apiKey) {
                await loadModels(apiKey, modelName);
                await ext.storage.local.remove("currentSession");
            } else {
                renderApiKeyWarning(contentDiv);
            }

        } catch (e) {
            console.error("Error initializing sidebar:", e);
        }
    })();
});
