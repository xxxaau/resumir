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
    const modelSelect = document.getElementById("model-select");

    let isGenerating = false;
    let abortController = null;
    let currentMetadata = { title: "", url: "", summary: "", fromCache: false };
    let currentSourceText = "";
    let contentPreload = null;
    let isBionicEnabled = false;
    let globalConfigCache = {};

    // --- Context object for summary.js ---
    const ctx = {
        contentDiv,
        errorDiv,
        modelSelect,
        currentMetadata,
        getSourceText: () => currentSourceText,
        setSourceText: (t) => { currentSourceText = t; },
        getContentPreload: () => contentPreload,
        isBionicEnabled: () => isBionicEnabled,
        getGlobalConfig: () => globalConfigCache
    };

    // Bound summary starter (partially applied with ctx)
    const doSummary = (overrideText, isDeepDive, isScience, isUserInitiated) => {
        if (isGenerating && abortController) {
            abortController.abort();
            abortController = null;
            isGenerating = false;
            setGeneratingState(false, !!currentMetadata.summary);
            return;
        }
        isGenerating = true;
        startSummary(ctx, overrideText, isDeepDive, isScience, isUserInitiated).then(ctrl => {
            abortController = ctrl;
        }).finally(() => {
            isGenerating = false;
            abortController = null;
        });
    };

    // --- Configuration Initialization & Migration ---
    ext.storage.sync.get(["apiKey"]).then(async (syncConfig) => {
        if (!syncConfig.apiKey) {
            const localConfig = await ext.storage.local.get(["apiKey", "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "obsidianVault", "obsidianPath", "obsidianTemplate", "markdownTemplate"]);
            if (localConfig.apiKey) {
                console.warn("Migrating settings from Local to Sync...");
                await ext.storage.sync.set(localConfig);
            }
        }
    });

    const CONFIG_KEYS = ["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableScience", "enableResum", "extensionOrder", "markdownTemplate", "obsidianVault", "obsidianPath", "obsidianTemplate", "bionicFont", "bionicWeight", "bionicLineHeight", "bionicFixation"];

    ext.storage.sync
      .get(CONFIG_KEYS)
      .then(config => {
          globalConfigCache = config;
          applyExtensionVisibility(config);
          if (config.extensionOrder) {
              applyExtensionOrder(config.extensionOrder);
          }
          resetUI(false, config);
      })
      .catch(e => console.error("Error loading initial visibility config:", e));

    ext.storage.onChanged.addListener((changes, area) => {
        if (area === 'sync') {
            if (changes.apiKey && changes.apiKey.newValue !== changes.apiKey.oldValue) {
                // Only reload if API key actually changed (to avoid wiping summary on font change)
                if (changes.apiKey.newValue) {
                    window.location.reload();
                } else {
                    // If removed, we need to show the warning
                    window.location.reload();
                }
            }
            if (changes.modelName) {
                if (modelSelect && modelSelect.value !== changes.modelName.newValue && changes.modelName.newValue) {
                    modelSelect.value = changes.modelName.newValue;
                }
                if (globalConfigCache) {
                    globalConfigCache.modelName = changes.modelName.newValue;
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
                    if (changes.bionicFont || changes.bionicWeight || changes.bionicLineHeight || changes.bionicFixation) {
                        if (!isBionicEnabled) {
                            isBionicEnabled = true;
                            if (bionicBtn) {
                                bionicBtn.classList.add("active");
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

    // Open links in content area in a new browser tab (extension sidebar context)
    contentDiv.addEventListener("click", (e) => {
        const anchor = e.target.closest("a[href]");
        if (anchor) {
            e.preventDefault();
            ext.tabs.create({ url: anchor.href });
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
                setTimeout(() => ext.tabs.remove(tab.id), 3000);
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
        contentDiv.style.fontFamily = cfg.bionicFont || "inherit";
        contentDiv.style.lineHeight = cfg.bionicLineHeight || "1.5";
        contentDiv.style.setProperty("--bionic-weight", cfg.bionicWeight || "700");
        const fixation = (cfg.bionicFixation || 30) / 100;
        if (currentMetadata.summary) {
            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, true, fixation));
        }
    }

    bionicBtn.addEventListener("click", async () => {
        isBionicEnabled = !isBionicEnabled;
        ext.storage.local.set({ isBionicActive: isBionicEnabled });
        if (isBionicEnabled) {
            bionicBtn.classList.add("active");
            applyBionicToContent();
        } else {
            bionicBtn.classList.remove("active");
            contentDiv.style.fontFamily = "";
            contentDiv.style.lineHeight = "";
            if (currentMetadata.summary) {
               contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, false));
            }
        }
    });

    deepDiveBtn.addEventListener("click", () => {
        doSummary(null, true, false, true);
    });

    scienceBtn.addEventListener("click", () => {
        doSummary(null, false, true, true);
    });

    settingsBtn.addEventListener("click", () => {
        ext.runtime.openOptionsPage();
    });

    modelSelect.addEventListener("change", async (e) => {
        if (e.target.value === "__open_settings__") {
            // Revertir al model anterior i obrir configuració
            const saved = await ext.storage.sync.get({ modelName: "gemini-2.0-flash" });
            modelSelect.value = saved.modelName;
            ext.runtime.openOptionsPage();
            return;
        }
        await ext.storage.sync.set({ modelName: e.target.value });
        refreshRemainingOnModelChange(e.target.value);
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

    ext.runtime.onMessage.addListener((message) => {
        if (message.action === "trigger_summary") {
            boundTrigger(message.data);
        }
    });

    // Check for pending summary on load (context menu while sidebar was closed)
    ext.storage.local.get("pendingSummary").then(data => {
        if (data.pendingSummary) {
            boundTrigger(data.pendingSummary);
            ext.storage.local.remove("pendingSummary");
        }
    });

    // Watch for pendingSummary changes (reliable fallback for Chrome sidePanel timing)
    ext.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.pendingSummary && changes.pendingSummary.newValue) {
            boundTrigger(changes.pendingSummary.newValue);
            ext.storage.local.remove("pendingSummary");
        }
    });

    // --- On Load Init ---
    (async () => {
        try {
            const syncData = await ext.storage.sync.get(["apiKey", "modelName"]);
            const localData = await ext.storage.local.get(["blockedUntil", "isBionicActive"]);

            const apiKey = syncData.apiKey;
            let modelName = syncData.modelName || DEFAULT_MODEL_ID;
            
            if (localData.isBionicActive === true) {
                isBionicEnabled = true;
                if (bionicBtn) {
                    bionicBtn.classList.add("active");
                }
            }
            
            // Show footer immediately (model select always visible)
            const footer = document.getElementById("footer-status");
            if (footer) footer.classList.remove("hidden");
            
            contentPreload = getPageContent().catch(() => null);

            if (localData.blockedUntil && Date.now() < localData.blockedUntil) {
                runCountdownTimer(localData.blockedUntil);
            } else {
                if (localData.blockedUntil) await ext.storage.local.remove("blockedUntil");
            }

            if (apiKey) {
                await loadModels(apiKey, modelName);
                refreshRemainingOnModelChange(modelSelect.value || modelName);
                await ext.storage.local.remove("currentSession");
            } else {
                renderApiKeyWarning(contentDiv);
            }

        } catch (e) {
            console.error("Error initializing sidebar:", e);
        }
    })();
});
