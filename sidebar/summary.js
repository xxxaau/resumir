// sidebar/summary.js
// Core summary generation logic extracted from sidebar.js

// Fallback prompts — the full defaults live in settings.js and are saved to storage.
// These are only used if storage has never been written (fresh install, first run).
const DEFAULT_SYSTEM_PROMPT = "Ets un assistent expert en resumir contingut web. Respon SEMPRE en CATALÀ.";
const DEFAULT_DEEP_DIVE_PROMPT = "Actua com un expert analista. Proporciona una anàlisi profunda. Respon en CATALÀ.";
const DEFAULT_SCIENCE_PROMPT = "Ets un científic amb àmplia trajectòria acadèmica. Valida la veracitat científica. Respon en CATALÀ.";

/**
 * Construeix la llista de models a provar en cas de quota esgotada.
 * Prova primer els favorits de l'usuari, després els models de CURATED_MODELS amb fallback:true.
 * Mai duplica models.
 *
 * @param {string} preferredModel - Model triat per l'usuari
 * @param {string[]} favoriteIds - IDs dels models favorits de l'usuari
 * @returns {string[]} Llista ordenada de models a provar
 */
function buildFallbackList(preferredModel, favoriteIds) {
    const globalFallbacks = CURATED_MODELS
        .filter(m => m.fallback === true)
        .map(m => m.id);
    return [...new Set([preferredModel, ...favoriteIds, ...globalFallbacks])];
}

/**
 * Main summary generation function.
 *
 * @param {Object} ctx - Context object with DOM references and state
 * @param {HTMLElement} ctx.contentDiv - Main content display area
 * @param {HTMLElement} ctx.errorDiv - Error display area
 * @param {HTMLElement} ctx.modelSelect - Model dropdown element
 * @param {Object} ctx.currentMetadata - Mutable metadata { title, url, summary, fromCache }
 * @param {Function} ctx.getSourceText - Returns current source text
 * @param {Function} ctx.setSourceText - Sets current source text
 * @param {Function} ctx.getContentPreload - Returns content preload promise
 * @param {Function} ctx.isBionicEnabled - Returns bionic state
 * @param {Function} ctx.getGlobalConfig - Returns globalConfigCache
 * @param {string|null} overrideText - Override text (from context menu selection)
 * @param {boolean} isDeepDive - Whether this is a deep dive analysis
 * @param {boolean} isScience - Whether this is a scientific validation
 * @param {boolean} isUserInitiated - Whether user triggered this action
 * @returns {AbortController} The abort controller for cancellation
 */
async function startSummary(ctx, overrideText = null, isDeepDive = false, isScience = false, isUserInitiated = false) {
    if (!overrideText && !isDeepDive && !isScience && !isUserInitiated) {
        return null;
    }

    const { contentDiv, errorDiv, modelSelect, currentMetadata } = ctx;

    contentDiv.replaceChildren();
    contentDiv.classList.add("hidden");
    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");
    
    let activeBtnId = "summarizeBtn";
    if (isDeepDive) activeBtnId = "deepDiveBtn";
    else if (isScience) activeBtnId = "scienceBtn";
    
    setGeneratingState(true, false, activeBtnId);
    
    const loadingDiv = document.getElementById("loading");
    if (isScience) {
        loadingDiv.textContent = "Investigant la validació científica...";
    } else if (isDeepDive) {
        loadingDiv.textContent = "Generant anàlisi detallada...";
    } else {
        loadingDiv.textContent = "Generant resum...";
    }
    
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    const generationStartMs = startGenerationTimer();

    try {
        // 1. Get Configuration
        const config = await ext.storage.sync.get(["apiKey", "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "deepDivePrompt", "enableScience", "sciencePrompt", "extensionOrder", "favoriteModels"]);
        const apiKey = config.apiKey;
        let modelName = config.modelName || DEFAULT_MODEL_ID;
        
        let systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
        if (isDeepDive) {
            systemPrompt = config.deepDivePrompt || DEFAULT_DEEP_DIVE_PROMPT; 
        } else if (isScience) {
            systemPrompt = config.sciencePrompt || DEFAULT_SCIENCE_PROMPT; 
        }

        applyExtensionVisibility(config);
        if (config.extensionOrder) {
            applyExtensionOrder(config.extensionOrder);
        }

        if (!apiKey) {
            throw new Error("[001] No s'ha configurat la API Key. Ves a la pàgina d'opcions de l'extensió.");
        }

        if (signal.aborted) return abortController;

        // 2. Get Page Text & Check Cache
        let pageData = null;
        const tabs = await ext.tabs.query({active: true, currentWindow: true});
        if (tabs.length === 0) throw new Error("[002] No s'ha trobat cap pestanya activa.");
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
                
                
                if (ctx.isBionicEnabled()) {
                    const cfg = ctx.getGlobalConfig() || {};
                    contentDiv.style.fontFamily = cfg.bionicFont || "inherit";
                    contentDiv.style.lineHeight = cfg.bionicLineHeight || "1.5";
                    contentDiv.style.setProperty("--bionic-weight", cfg.bionicWeight || "700");
                } else {
                    contentDiv.style.fontFamily = "";
                    contentDiv.style.lineHeight = "";
                }
                
                setGeneratingState(false, true);
                
                const footer = document.getElementById("footer-status");
                footer.classList.remove("hidden");
                
                if (cachedEntry.model) {
                    if (modelSelect.value !== cachedEntry.model) {
                        if (!modelSelect.querySelector(`option[value='${CSS.escape(cachedEntry.model)}']`)) {
                            const opt = document.createElement("option");
                            opt.value = cachedEntry.model;
                            opt.textContent = cachedEntry.model;
                            modelSelect.appendChild(opt);
                        }
                        modelSelect.value = cachedEntry.model;
                    }
                }

                const remainEl = document.getElementById("requests-remaining");
                if (remainEl) {
                    const dateStr = new Date(cachedEntry.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    remainEl.textContent = `Memòria cau (${dateStr})`;
                    remainEl.style.color = "#28a745";
                }

                getPageContent().then(data => {
                    if (data && data.text) {
                        ctx.setSourceText(data.text);
                    }
                }).catch(() => { /* background preload failed silently */ });
                
                return abortController;
            }
        }

        const contentPreload = ctx.getContentPreload();
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
        } else if ((isDeepDive || isScience) && ctx.getSourceText()) {
            pageData = {
                title: currentMetadata.title,
                url: currentMetadata.url,
                text: ctx.getSourceText()
            };
        } else if (!pageData) {
            pageData = await getPageContent();
        }

        currentMetadata.title = pageData.title;
        // Mark selection URLs uniquely so they don't conflict with the full page cache logic
        currentMetadata.url = overrideText ? "seleccio:" + pageData.url : pageData.url;
        currentMetadata.summary = ""; 
        currentMetadata.fromCache = false; 
        
        let pageText = pageData.text;
        ctx.setSourceText(pageText);

        if (signal.aborted) return abortController;

        // Token Limit handling — usar contextWindow del model triat (deixant 20% de marge)
        // Nota: s'usa CURATED_MODELS.find() directament per evitar dep. creuada amb api.js en tests.
        // El ratio chars/token canvia de 3.5 (original) a 4 per aproximació més precisa per Gemini.
        const modelEntry = CURATED_MODELS.find(m => m.id === modelName);
        const safeLimit = Math.floor(((modelEntry && modelEntry.contextWindow) || 200_000) * 0.8);
        const estimatedTokens = estimateTokens(pageText);
        if (estimatedTokens > safeLimit) {
            const charLimit = safeLimit * 4; // ~4 chars/token (abans era 3.5 — intencionadament canviat)
            pageText = pageText.substring(0, charLimit) + "\n\n[... Text truncated due to model limits ...]";
        }

        // 3. Call Gemini API (with Auto-Fallback on Quota Exceeded)
        let lastUpdate = 0;
        const modelsToTry = buildFallbackList(modelName, config.favoriteModels || []);
        let success = false;
        let lastError = null;
        const bionicEnabled = ctx.isBionicEnabled();

        for (const tryModel of modelsToTry) {
            if (signal.aborted) break;
            try {
                currentMetadata.summary = ""; // Reset output text 
                await callGeminiStream(apiKey, tryModel, systemPrompt, pageText, signal, (chunkText) => {
                    currentMetadata.summary += chunkText;
                    const now = Date.now();
                    if (now - lastUpdate > 100) {
                      contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, bionicEnabled));
                      lastUpdate = now;
                    }
                });
                success = true;
                // Update model name to the successful one 
                modelName = tryModel; 
                
                // Automatically update settings UI so it's transparently synced for the user next time
                ext.storage.sync.set({ modelName: tryModel });
                const dropdown = document.getElementById("model-select");
                if (dropdown && dropdown.value !== tryModel) {
                    dropdown.value = tryModel;
                }

                break; // Request successful
            } catch (e) {
                if (signal.aborted || e.name === 'AbortError') throw e;
                const msg = e.message.toLowerCase();
                if (msg.includes("429") || msg.includes("quota") || msg.includes("exhausted") || msg.includes("resource has been exhausted") || msg.includes("overloaded")) {
                    console.warn(`Model ${tryModel} exhausted quota or overloaded. Attempting fallback...`);
                    lastError = e;
                    continue;
                }
                throw e; // Other unexpected errors
            }
        }

        if (!success && lastError && !signal.aborted) {
            throw new Error("[003] Tots els models disponibles han fallat (manca de quota). Si us plau, proveu-ho més tard.");
        }
        
        contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, bionicEnabled));
        
        if (bionicEnabled) {
             const cfg = ctx.getGlobalConfig() || {};
             contentDiv.style.fontFamily = cfg.bionicFont || "inherit";
             contentDiv.style.lineHeight = cfg.bionicLineHeight || "1.5";
             contentDiv.style.setProperty("--bionic-weight", cfg.bionicWeight || "700");
        } else {
             contentDiv.style.fontFamily = "";
             contentDiv.style.lineHeight = "";
        }
        
        setGeneratingState(false, true);
        contentDiv.classList.remove("hidden");
        
        // 4. Update Stats & Cache
        const inputTokens = pageText.length / 4;
        const outputTokens = currentMetadata.summary.length / 4;
        
        await saveSummaryCache(currentMetadata.url, currentMetadata.title, currentMetadata.summary, modelName, inputTokens, outputTokens);
        await saveUsageStats(inputTokens, outputTokens, isDeepDive || isScience, modelName, Date.now() - generationStartMs, currentMetadata.title, currentMetadata.url);
        
        const { byModel, total } = await getDailyStats(modelName);
        updateWaterStats(total, modelName, byModel);

    } catch (err) {
        if (signal.aborted || err.name === 'AbortError') {
            errorDiv.textContent = "Generació aturada per l'usuari.";
            errorDiv.classList.remove("hidden");
        } else {
            stopGenerationTimer();
            const errorInfo = classifyError(err);
            errorDiv.textContent = errorInfo.message;
            errorDiv.classList.remove("hidden");

            if (errorInfo.showConfig) {
               const btn = document.createElement("button");
               btn.textContent = "Configurar";
               btn.className = "primary";
               btn.style.marginTop = "10px";
               btn.onclick = () => ext.runtime.openOptionsPage();
               errorDiv.appendChild(document.createElement("br"));
               errorDiv.appendChild(btn);
            }
        }
    } finally {
        setGeneratingState(false, !!currentMetadata.summary);
    }

    return abortController;
}

/**
 * Classifies API errors and returns user-friendly messages.
 */
function classifyError(err) {
    const msg = err.message || "";
    const msgLower = msg.toLowerCase();
    
    // API key invalid or revoked (401/403)
    if (msg.includes("401") || msg.includes("403") || msgLower.includes("api key not valid")) {
        return {
            message: "La clau API no és vàlida o ha estat revocada. Comprova-la a la configuració.",
            showConfig: true
        };
    }
    
    // API key missing
    if (msgLower.includes("api key") || msgLower.includes("not found")) {
        return {
            message: msg,
            showConfig: true
        };
    }
    
    // Quota exceeded (429)
    if (msg.includes("429") || msgLower.includes("quota") || msgLower.includes("exhausted")) {
        return {
            message: msg + " Tots els models alternatius també han excedit la quota. Proveu-ho més tard.",
            showConfig: false
        };
    }
    
    // Permission errors (host permissions)
    if (msgLower.includes("permission") || msgLower.includes("access denied") || msgLower.includes("missing host permission")) {
        return {
            message: "No es pot accedir al contingut d'aquesta pàgina. Obre la configuració i concedeix permisos.",
            showConfig: true
        };
    }
    
    // Default
    return {
        message: msg,
        showConfig: false
    };
}

/**
 * Handles context menu triggers.
 */
function handleTrigger(startSummaryFn, data) {
    if (data.type === 'selection' && data.content) {
        setTimeout(() => startSummaryFn(data.content, false, false, true), 100);
    } else if (data.type === 'page') {
        setTimeout(() => startSummaryFn(null, false, false, true), 100);
    }
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { classifyError, buildFallbackList };
}
