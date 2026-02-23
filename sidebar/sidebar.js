const DEFAULT_SYSTEM_PROMPT = `Ets un assistent expert en resumir contingut web. La teva tasca és analitzar el text i generar un resum en CATALÀ.

CRITERIS IMPORTANTS:
1. Respon SEMPRE en CATALÀ.
2. NO incloguis cap frase introductòria (ex: "Aquí teniu el resum...", "A continuació...").
3. NO incloguis el títol "**Resum Executiu**". Comença DIRECTAMENT amb el primer paràgraf del resum.

Estructura de la resposta:
[Aquí va directament el paràgraf del resum executiu de màxim 150 paraules, sense cap títol previ]

### Punts Clau
- [Llista de 5-10 punts essencials]

### Aprenentatges
- [Mínim 3 conclusions pràctiques]

### Cites Destacades
- [Màxim 3 cites literals]`;

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

    // --- Configuration Initialization & Migration ---
    ext.storage.sync.get(["apiKey"]).then(async (syncConfig) => {
        if (!syncConfig.apiKey) {
            const localConfig = await ext.storage.local.get(["apiKey", "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "obsidianVault", "obsidianPath", "obsidianTemplate", "markdownTemplate"]);
            if (localConfig.apiKey) {
                console.log("Migrating settings from Local to Sync...");
                await ext.storage.sync.set(localConfig);
            }
        }
    });

    ext.storage.sync
      .get(["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableDeepDive", "enableScience", "extensionOrder", "markdownTemplate", "obsidianVault", "obsidianPath", "obsidianTemplate", "bionicFont", "bionicLineHeight", "bionicFixation"])
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
            if (changes.apiKey) {
                window.location.reload();
            }
            if (changes.modelName) {
                const modelSelect = document.getElementById("model-select");
                if (modelSelect && modelSelect.value !== changes.modelName.newValue && changes.modelName.newValue) {
                    modelSelect.value = changes.modelName.newValue;
                }
                if (globalConfigCache) {
                    globalConfigCache.modelName = changes.modelName.newValue;
                }
            }
            if (changes.enableMarkdown || changes.enableObsidian || changes.enableBionic || 
                changes.enableDeepdive || changes.enableDeepDive || changes.enableScience || changes.extensionOrder ||
                changes.markdownTemplate || changes.obsidianVault || changes.obsidianPath ||
                changes.obsidianTemplate || changes.bionicFont || changes.bionicLineHeight ||
                changes.bionicFixation) {
                ext.storage.sync
                  .get(["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableDeepDive", "enableScience", "extensionOrder", "markdownTemplate", "obsidianVault", "obsidianPath", "obsidianTemplate", "bionicFont", "bionicLineHeight", "bionicFixation"])
                  .then(config => {
                      globalConfigCache = config;
                      applyExtensionVisibility(config);
                      if (config.extensionOrder) {
                          applyExtensionOrder(config.extensionOrder);
                      }
                  });
            }
        }
    });

    // --- Button Event Listeners ---

    summarizeBtn.addEventListener("click", async () => {
        if (isGenerating) {
            if (abortController) {
                abortController.abort();
                abortController = null;
            }
            isGenerating = false;
            setGeneratingState(false, !!currentMetadata.summary);
            return;
        }
        await startSummary(null, false, false, true);
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
                const tabs = await ext.tabs.query({active: true, currentWindow: true});
                if (tabs.length > 0) {
                    await ext.tabs.update(tabs[0].id, {url: uri});
                } else {
                    const tab = await ext.tabs.create({ url: uri, active: false });
                    setTimeout(() => ext.tabs.remove(tab.id), 5000);
                }
            } catch (err) {
                console.error("Obsidian protocol failed:", err);
                errorDiv.textContent = "Error obrint Obsidian: " + err.message;
                errorDiv.classList.remove("hidden");
            }
            
            const originalChild = obsidianBtn.firstElementChild.cloneNode(true);
            obsidianBtn.replaceChildren(getIcon(CHECK_ICON_STR));
            setTimeout(() => obsidianBtn.replaceChildren(originalChild), 1500);

        } catch (e) {
            console.error("Error Obisidian:", e);
            errorDiv.textContent = "Error: " + e.message;
            errorDiv.classList.remove("hidden");
        }
    });

    bionicBtn.addEventListener("click", async () => {
        isBionicEnabled = !isBionicEnabled;
        if (isBionicEnabled) {
            bionicBtn.style.color = "var(--primary-color)";
            bionicBtn.style.backgroundColor = "rgba(0,0,0,0.05)";
            
            contentDiv.style.fontFamily = globalConfigCache.bionicFont || "inherit";
            contentDiv.style.lineHeight = globalConfigCache.bionicLineHeight || "1.5";
            const fixation = (globalConfigCache.bionicFixation || 45) / 100;
            
            if (currentMetadata.summary) {
               contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, true, fixation));
            }
        } else {
            bionicBtn.style.color = "";
            bionicBtn.style.backgroundColor = "";
            contentDiv.style.fontFamily = "";
            contentDiv.style.lineHeight = "";
            
            if (currentMetadata.summary) {
               contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, false));
            }
        }
    });

    deepDiveBtn.addEventListener("click", async () => {
        await startSummary(null, true, false, true);
    });

    scienceBtn.addEventListener("click", async () => {
        await startSummary(null, false, true, true);
    });

    settingsBtn.addEventListener("click", () => {
        ext.runtime.openOptionsPage();
    });

    modelSelect.addEventListener("change", async (e) => {
        await ext.storage.sync.set({ modelName: e.target.value });
    });

    // --- Main Generation Logic ---

    async function startSummary(overrideText = null, isDeepDive = false, isScience = false, isUserInitiated = false) {
        if (!overrideText && !isDeepDive && !isScience && !isUserInitiated) {
            return; 
        }

        contentDiv.replaceChildren();
        contentDiv.classList.add("hidden");
        errorDiv.textContent = "";
        errorDiv.classList.add("hidden");
        
        isGenerating = true;
        setGeneratingState(true, false);
        
        const loadingDiv = document.getElementById("loading");
        if (isScience) {
            loadingDiv.textContent = "Investigant la validació científica...";
        } else if (isDeepDive) {
            loadingDiv.textContent = "Generant anàlisi detallada...";
        } else {
            loadingDiv.textContent = "Generant resum...";
        }
        
        abortController = new AbortController();
        const signal = abortController.signal;
        
        const generationStartMs = startGenerationTimer();

        try {
            // 1. Get Configuration
            const config = await ext.storage.sync.get(["apiKey", "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "deepDivePrompt", "enableScience", "sciencePrompt", "extensionOrder"]);
            const apiKey = config.apiKey;
            const modelName = config.modelName || "gemma-3-27b-it";
            
            let systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
            if (isDeepDive) {
                systemPrompt = config.deepDivePrompt || "Actua com un expert analista..."; 
            } else if (isScience) {
                systemPrompt = config.sciencePrompt || "Avalua científicament aquest text. IMPORTANT: Respon ÚNICAMENT amb els punts d'avaluació. PROHIBIT fer introduccions o conclusions. Assenyala de forma directa afirmacions dubtoses o desviacions del consens actual. Has de justificar cada punt citant de forma intergrada en el propi text de l'argumentació almenys 3 referències acadèmiques altament reputades, incloent els seus respectius enllaços (URL o DOI)."; 
            }

            applyExtensionVisibility(config);
            if (config.extensionOrder) {
                applyExtensionOrder(config.extensionOrder);
            }

            if (!apiKey) {
                throw new Error("No s'ha configurat la API Key. Ves a la pàgina d'opcions de l'extensió.");
            }

            if (signal.aborted) return;

            // 2. Get Page Text & Check Cache
            let pageData = null;
            const tabs = await ext.tabs.query({active: true, currentWindow: true});
            if (tabs.length === 0) throw new Error("No s'ha trobat cap pestanya activa.");
            const currentUrl = tabs[0].url;

            const isRefresh = (currentMetadata.url === currentUrl && currentMetadata.fromCache);
            
            if (!isRefresh && !overrideText && !isDeepDive && !isScience) {
                const cachedEntry = await getSummaryCache(currentUrl);
                if (cachedEntry && cachedEntry.summary) {
                    currentMetadata.title = cachedEntry.title || tabs[0].title;
                    currentMetadata.url = currentUrl;
                    currentMetadata.summary = cachedEntry.summary;
                    currentMetadata.fromCache = true;

                    contentDiv.replaceChildren(formatTextToFragment(cachedEntry.summary));
                    contentDiv.classList.remove("hidden");
                    
                    isGenerating = false;
                    setGeneratingState(false, true);
                    
                    const footer = document.getElementById("footer-status");
                    footer.classList.remove("hidden");
                    
                    if (cachedEntry.model) {
                        if (modelSelect.value !== cachedEntry.model) {
                            if (!modelSelect.querySelector(`option[value='${cachedEntry.model}']`)) {
                                const opt = document.createElement("option");
                                opt.value = cachedEntry.model;
                                opt.textContent = cachedEntry.model;
                                modelSelect.appendChild(opt);
                            }
                            modelSelect.value = cachedEntry.model;
                        }
                    }

                    const quotaCount = document.getElementById("quota-count");
                    quotaCount.textContent = "MEMÒRIA CAU";
                    quotaCount.style.color = "#28a745"; 
                    
                    const resetEl = document.getElementById("quota-reset");
                    const dateStr = new Date(cachedEntry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    resetEl.textContent = `Generat: ${dateStr}`;
                    resetEl.style.color = "#666";

                    getPageContent().then(data => {
                        if (data && data.text) {
                            currentSourceText = data.text;
                        }
                    }).catch(e => console.log("Background context fetch failed:", e));
                    
                    return;
                }
            }

            if (contentPreload) {
                try {
                    const preloaded = await contentPreload;
                    if (preloaded && preloaded.url === currentUrl) {
                        pageData = preloaded;
                    }
                } catch (e) {
                    console.warn("Preload failed, retrying fresh:", e);
                }
            }

            if (overrideText) {
                pageData = {
                   title: "Selecció: " + tabs[0].title,
                   url: currentUrl,
                   text: overrideText
                };
            } else if ((isDeepDive || isScience) && currentSourceText) {
                pageData = {
                    title: currentMetadata.title,
                    url: currentMetadata.url,
                    text: currentSourceText
                };
            } else if (!pageData) {
                pageData = await getPageContent();
            }

            currentMetadata.title = pageData.title;
            currentMetadata.url = pageData.url;
            currentMetadata.summary = ""; 
            currentMetadata.fromCache = false; 
            
            let pageText = pageData.text;
            currentSourceText = pageText;

            if (signal.aborted) return;
            
            // Token Limit handling
            const safeLimit = 8000;
            const estimatedTokens = estimateTokens(pageText);
            if (estimatedTokens > safeLimit) {
                 const charLimit = safeLimit * 3.5;
                 pageText = pageText.substring(0, charLimit) + "\n\n[... Text truncated due to model limits ...]";
            }

            // 3. Call Gemini API
            let lastUpdate = 0;
            await callGeminiStream(apiKey, modelName, systemPrompt, pageText, signal, (chunkText) => {
                currentMetadata.summary += chunkText;
                const now = Date.now();
                if (now - lastUpdate > 100) {
                  contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, isBionicEnabled));
                  lastUpdate = now;
                }
            });
            
            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, isBionicEnabled));
            
            isGenerating = false;
            setGeneratingState(false, true);
            contentDiv.classList.remove("hidden");
            
            // 4. Update Stats & Cache
            const inputTokens = pageText.length / 4;
            const outputTokens = currentMetadata.summary.length / 4;
            
            await saveSummaryCache(currentMetadata.url, currentMetadata.title, currentMetadata.summary, modelName, inputTokens, outputTokens);
            await saveUsageStats(inputTokens, outputTokens, isDeepDive || isScience, modelName, Date.now() - generationStartMs, currentMetadata.title, currentMetadata.url);
            
            updateTokenStats(Math.round(inputTokens), Math.round(outputTokens));

        } catch (err) {
            if (signal.aborted || err.name === 'AbortError') {
                errorDiv.textContent = "Generació aturada per l'usuari.";
                errorDiv.classList.remove("hidden");
            } else {
                stopGenerationTimer();
                errorDiv.textContent = err.message;
                errorDiv.classList.remove("hidden");

                if (err.message.includes("API Key") || err.message.includes("not found")) {
                   const btn = document.createElement("button");
                   btn.textContent = "Configurar";
                   btn.className = "primary";
                   btn.style.marginTop = "10px";
                   btn.onclick = () => ext.runtime.openOptionsPage();
                   errorDiv.appendChild(document.createElement("br"));
                   errorDiv.appendChild(btn);
                }
                
                if (err.message.includes("429") || err.message.includes("Quota exceeded") || err.message.includes("retry in")) {
                   errorDiv.textContent += " (Quota excedida)";
                }
            }
        } finally {
            isGenerating = false;
            setGeneratingState(false, !!currentMetadata.summary);
            abortController = null;
        }
    }

    // --- Context Menu / Message Handling ---
    async function handleTrigger(data) {
        if (data.type === 'selection' && data.content) {
            setTimeout(() => startSummary(data.content, false, false, true), 100);
        } else if (data.type === 'page') {
            setTimeout(() => startSummary(null, false, false, true), 100);
        }
    }

    ext.runtime.onMessage.addListener((message) => {
        if (message.action === "trigger_summary") {
            handleTrigger(message.data);
        }
    });

    ext.storage.local.get("pendingSummary").then(data => {
        if (data.pendingSummary) {
            handleTrigger(data.pendingSummary);
            ext.storage.local.remove("pendingSummary");
        }
    });

    // --- On Load Init ---
    (async () => {
        try {
            const syncData = await ext.storage.sync.get(["apiKey", "modelName"]);
            const localData = await ext.storage.local.get(["blockedUntil"]);
            
            const apiKey = syncData.apiKey;
            const modelName = syncData.modelName || "gemini-1.5-flash-latest";
            
            updateTokenStats(0, 0);
            
            contentPreload = getPageContent().catch(e => console.log("Speculative load failed:", e));

            if (localData.blockedUntil && Date.now() < localData.blockedUntil) {
                runCountdownTimer(localData.blockedUntil);
            } else {
                if (localData.blockedUntil) await ext.storage.local.remove("blockedUntil");
            }

            if (apiKey) {
                await loadModels(apiKey, modelName);
                // Active session restoration removed per user request:
                // We want a clean slate every time the extension is opened or reloaded.
                await ext.storage.local.remove("currentSession");
            } else {
                const opt = document.createElement("option");
                opt.textContent = "Falta API Key";
                modelSelect.replaceChildren(opt);
                modelSelect.disabled = true;
                
                modelSelect.style.color = "#d70022";
                modelSelect.style.borderColor = "#d70022";
                modelSelect.style.backgroundColor = "#fff0f0"; 
                modelSelect.style.fontWeight = "bold";

                contentDiv.innerHTML = `
                  <div class="api-key-warning-container">
                      <div style="margin-bottom: 25px;">
                          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="api-key-icon">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                          </svg>
                          <p class="api-key-title">Falta configurar l'API Key</p>
                          <p class="api-key-desc">Necessària per connectar amb Google Gemini.</p>
                      </div>
                      <button id="configApiKeyBtn" class="primary api-key-btn-primary">Configurar Ara</button>
                      <div class="api-key-cta-footer">
                          <span class="api-key-cta-text">Encara no en tens?</span>
                          <a id="getApiKeyLink" href="#" class="api-key-cta-link">
                              Obtenir API Key gratuïta &rarr;
                          </a>
                      </div>
                  </div>
                `;
                contentDiv.classList.remove("hidden");
                
                document.getElementById("configApiKeyBtn").addEventListener("click", () => {
                    ext.runtime.openOptionsPage();
                });

                document.getElementById("getApiKeyLink").addEventListener("click", (e) => {
                    e.preventDefault();
                    ext.tabs.create({ url: "https://aistudio.google.com/app/apikey" });
                });
            }

        } catch (e) {
            console.error("Error initializing sidebar:", e);
        }
    })();
});
