/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/summary.js
// Core summary generation logic extracted from sidebar.js

// DEFAULT_SYSTEM_PROMPT, DEFAULT_DEEP_DIVE_PROMPT, DEFAULT_SCIENCE_PROMPT
// definits a shared/defaults.js (carregat abans en sidebar.html i al bundle)

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

function applyBionicStyles(element, isEnabled, config = {}) {
    if (!element) return;
    if (isEnabled) {
        element.style.fontFamily = config.bionicFont || DEFAULT_BIONIC.font;
        element.style.fontSize = config.bionicFontSize || DEFAULT_BIONIC.fontSize;
        element.style.lineHeight = config.bionicLineHeight || DEFAULT_BIONIC.lineHeight;
        element.style.setProperty("--bionic-weight", config.bionicWeight || DEFAULT_BIONIC.weight);
    } else {
        element.style.fontFamily = "";
        element.style.fontSize = "";
        element.style.lineHeight = "";
        element.style.removeProperty("--bionic-weight");
    }
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
 * @param {boolean} isConceptMap - Whether this is a concept map generation
 * @param {boolean} isSimple - Whether this is a plain-language explanation ("Explica-ho fàcil")
 * @returns {AbortController} The abort controller for cancellation
 */
async function startSummary(ctx, overrideText = null, isDeepDive = false, isScience = false, isUserInitiated = false, isConceptMap = false, isSimple = false) {
    if (!overrideText && !isDeepDive && !isScience && !isConceptMap && !isSimple && !isUserInitiated) {
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
    else if (isConceptMap) activeBtnId = "conceptMapBtn";
    else if (isSimple) activeBtnId = "explainSimpleBtn";
    
    setGeneratingState(true, false, activeBtnId);
    
    const abortController = new AbortController();
    const signal = abortController.signal;
    
    const generationStartMs = startGenerationTimer();
    updateTokenStats(0, 0);  // Reset tokens display for new generation

    try {
        // 1. Get Configuration
        const [config, localSecrets] = await Promise.all([
            ext.storage.sync.get([
                "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "enableBionic",
                "enableDeepdive", "deepDivePrompt", "enableScience", "sciencePrompt",
                "enableSimple", "simplePrompt",
                "enableConceptMap", "extensionOrder", "favoriteModels",
                "conceptMapPrompt", "conceptMapDepth", "conceptMapBranches", "conceptMapShowDescriptions",
                "conceptMapAutoExpand",
                "bionicFont", "bionicWeight", "bionicFontSize", "bionicLineHeight", "bionicFixation"
            ]),
            ext.storage.local.get(["apiKey"])
        ]);
        const apiKey = localSecrets.apiKey;
        let modelName = config.modelName || DEFAULT_MODEL_ID;
        
        let systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
        if (isDeepDive) {
            systemPrompt = config.deepDivePrompt || DEFAULT_DEEP_DIVE_PROMPT;
        } else if (isScience) {
            systemPrompt = config.sciencePrompt || DEFAULT_SCIENCE_PROMPT;
        } else if (isSimple) {
            systemPrompt = config.simplePrompt || DEFAULT_SIMPLE_PROMPT;
        } else if (isConceptMap) {
            // Build dynamic prompt based on config
            const basePrompt = config.conceptMapPrompt || DEFAULT_CONCEPTMAP_PROMPT;
            const depth = config.conceptMapDepth || 4;
            const branches = config.conceptMapBranches || 6;
            const showDesc = config.conceptMapShowDescriptions !== false;
            
            systemPrompt = basePrompt
                .replace(/Màxim \d+ nivells de profunditat\./, `Màxim ${depth} nivells de profunditat.`)
                .replace(/Segon nivell: \d+-\d+ branques principals\./, `Segon nivell: ${Math.max(3, branches - 2)}-${branches} branques principals.`);
            
            if (!showDesc) {
                systemPrompt = systemPrompt.replace(/9\. Opcionalment.*?: " \(dos punts \+ espai\)\.\n/, "");
            }
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

        // Check preload BEFORE cache (PDFs locals, etc.)
        const contentPreload = ctx.getContentPreload();
        let hasLocalPdf = false;
        if (contentPreload) {
            try {
                const preloaded = await contentPreload;
                if (preloaded && (preloaded.url === currentUrl || preloaded.url.startsWith("pdf-local:"))) {
                    pageData = preloaded;
                    if (preloaded.url.startsWith("pdf-local:")) hasLocalPdf = true;
                }
            } catch (e) {
                console.warn("Preload failed, retrying fresh:", e);
            }
        }

        const isRefresh = (!hasLocalPdf && currentMetadata.url === currentUrl && currentMetadata.fromCache);
        
        if (!isRefresh && !pageData && !overrideText && !isDeepDive && !isScience && !isConceptMap && !isSimple) {
            const cachedEntry = await getSummaryCache(currentUrl);
            if (cachedEntry && cachedEntry.summary) {
                currentMetadata.title = cachedEntry.title || tabs[0].title;
                currentMetadata.url = currentUrl;
                currentMetadata.summary = cachedEntry.summary;
                currentMetadata.fromCache = true;

                if (ctx.onPageIdentified) {
                    ctx.onPageIdentified(currentMetadata.title, currentMetadata.url);
                }

                const cachedSummary = cachedEntry.summary;
                const isCachedConceptMap = cachedSummary.startsWith("<!--conceptmap-->\n");
                const displayText = isCachedConceptMap ? cachedSummary.substring("<!--conceptmap-->\n".length) : cachedSummary;
                
                if (isCachedConceptMap) {
                    contentDiv.replaceChildren(renderMarkmapInteractive(displayText, currentMetadata.title, currentMetadata.url));
                } else {
                    contentDiv.replaceChildren(formatTextToFragment(displayText));
                }
                contentDiv.classList.remove("hidden");
                
                
                const cfg = ctx.getGlobalConfig() || {};
                applyBionicStyles(contentDiv, ctx.isBionicEnabled(), cfg);
                
                setGeneratingState(false, true);
                
                const footer = document.getElementById("footer-status");
                footer.classList.remove("hidden");
                
                if (cachedEntry.model) {
                    if (modelSelect.value !== cachedEntry.model) {
                        if (!Array.from(modelSelect.options).some(o => o.value === cachedEntry.model)) {
                            const opt = document.createElement("option");
                            opt.value = cachedEntry.model;
                            opt.textContent = cachedEntry.model;
                            modelSelect.appendChild(opt);
                        }
                        modelSelect.value = cachedEntry.model;
                    }
                }


                getPageContent().then(data => {
                    if (data && data.text) {
                        ctx.setSourceText(data.text);
                    }
                }).catch(() => { /* background preload failed silently */ });
                
                return abortController;
            }
        }

        if (overrideText) {
            pageData = {
               title: "Selecció: " + tabs[0].title,
               url: currentUrl,
               text: overrideText
            };
        } else if (!pageData) {
            pageData = await getPageContent();
        }

        currentMetadata.title = pageData.title;
        // Mark selection URLs uniquely so they don't conflict with the full page cache logic
        currentMetadata.url = overrideText ? "seleccio:" + pageData.url : pageData.url;
        currentMetadata.summary = "";
        currentMetadata.fromCache = false;

        if (ctx.onPageIdentified) {
            ctx.onPageIdentified(currentMetadata.title, currentMetadata.url);
        }

        // Neutralitza qualsevol delimitador fals dins del contingut no fiable
        // perquè no pugui "tancar" el bloc i fer-se passar per instruccions.
        // Regex tolerant: també variants amb espais o guions (</ UNTRUSTED-CONTENT >)
        // que un LLM podria interpretar igualment com a tancament del bloc.
        const safeContent = String(pageData.text || "").replace(/<\s*\/?\s*UNTRUSTED[_\s-]*CONTENT\s*>/gi, "[FILTERED]");
        let pageText = `<UNTRUSTED_CONTENT>\n${safeContent}\n</UNTRUSTED_CONTENT>`;
        ctx.setSourceText(pageData.text);

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
        contentDiv.classList.remove("hidden");
        let lastUpdate = 0;
        const modelsToTry = buildFallbackList(modelName, config.favoriteModels || []);
        if (modelsToTry.length === 0) {
            throw new Error("[003] No hi ha models configurats. Afegeix models favorits a la configuració.");
        }
        let success = false;
        let lastError = null;
        const bionicEnabled = ctx.isBionicEnabled();
        const bionicFixation = (config.bionicFixation || DEFAULT_BIONIC.fixation) / 100;
        // Apliquem els estils de contenidor (font/mida/interlineat) ABANS de
        // l'streaming perquè la previsualització en text pla ja surti amb la
        // mida correcta des del primer chunk. Sense això, en una obertura nova
        // el contentDiv no té estils inline i el text es veu petit fins que el
        // parse final el re-estilitza (en obertures posteriors els estils
        // quedaven de la vegada anterior, per això el bug només es veia el 1r cop).
        applyBionicStyles(contentDiv, bionicEnabled, config);
        let apiUsage = null;
        const liveInputTokens = estimateTokens(pageText);
        let liveOutputTokens = 0;
        let lastTokenUiUpdate = 0;

        updateTokenStats(liveInputTokens, liveOutputTokens, {
            inputEstimated: true,
            outputEstimated: true
        });

        for (const tryModel of modelsToTry) {
            if (signal.aborted) break;
            try {
                currentMetadata.summary = pageData.noTranscript ? "Vídeo sense transcripció.\n\n" : ""; // Reset output text
                liveOutputTokens = 0;
                const loadingDiv = document.getElementById("loading");
                apiUsage = await callGeminiStream(apiKey, tryModel, systemPrompt, pageText, signal, (chunkText) => {
                    // Amagar els puntets en el primer chunk rebut
                    if (loadingDiv && !loadingDiv.classList.contains("hidden")) {
                        loadingDiv.classList.add("hidden");
                    }
                    currentMetadata.summary += chunkText;
                    const now = Date.now();
                    if (now - lastUpdate > 100) {
                        // Text pla durant el streaming (ràpid, sense parse)
                        contentDiv.textContent = currentMetadata.summary;
                        lastUpdate = now;
                    }
                    if (now - lastTokenUiUpdate > 200) {
                        liveOutputTokens = estimateTokens(currentMetadata.summary);
                        updateTokenStats(liveInputTokens, liveOutputTokens, {
                            inputEstimated: true,
                            outputEstimated: true
                        });
                        lastTokenUiUpdate = now;
                    }
                }, (usageMeta) => {
                    if (!usageMeta) return;
                    const streamInput = usageMeta.promptTokenCount ?? liveInputTokens;
                    const streamOutput = usageMeta.candidatesTokenCount ?? liveOutputTokens;
                    updateTokenStats(streamInput, streamOutput, {
                        inputEstimated: usageMeta.promptTokenCount === undefined,
                        outputEstimated: usageMeta.candidatesTokenCount === undefined
                    });
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
                if (signal.aborted) throw e;
                // Prefer status-based classification when the error came from
                // callGeminiStream (it sets e.status from the HTTP response).
                // Fallback to message substring for network/timeout errors.
                const status = typeof e.status === "number" ? e.status : null;
                const msg = (e.message || "").toLowerCase();
                const isRetryable = status
                    ? (status === 404 || status === 429 || status === 500 || status === 502 || status === 503)
                    : (
                        msg.includes("quota") ||
                        msg.includes("exhausted") ||
                        msg.includes("overloaded") ||
                        msg.includes("service unavailable") ||
                        msg.includes("model not found") ||
                        msg.includes("model unavailable") ||
                        msg.includes("model is not available")
                    );
                if (isRetryable) {
                    const attempt = modelsToTry.indexOf(tryModel) + 1;
                    console.warn(`[${attempt}/${modelsToTry.length}] Model ${tryModel} unavailable. Trying next...`, e.message);
                    lastError = e;
                    continue;
                }
                throw e; // Other unexpected errors (auth, network, etc.)
            }
        }

        if (!success && lastError && !signal.aborted) {
            throw new Error("[003] Tots els models disponibles han fallat (manca de quota). Si us plau, proveu-ho més tard.");
        }
        
        if (isConceptMap) {
            contentDiv.replaceChildren(renderMarkmapInteractive(currentMetadata.summary, currentMetadata.title, currentMetadata.url));
        } else {
            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, bionicEnabled, bionicFixation));
        }

        applyBionicStyles(contentDiv, bionicEnabled, config);
        
        setGeneratingState(false, true);
        
        // 4. Update Stats & Cache
        // apiUsage is null if the stream failed mid-flight or the API returned no usageMetadata.
        // Fall back to character-based estimates in those cases.
        const inputTokens  = apiUsage?.inputTokens  ?? pageText.length / 4;
        const outputTokens = apiUsage?.outputTokens ?? currentMetadata.summary.length / 4;
        const cacheTokens  = apiUsage?.cacheTokens  ?? 0;
        
        const contentType = isConceptMap ? "conceptmap" : isScience ? "science" : isDeepDive ? "deepdive" : isSimple ? "simple" : "summary";
        const summaryToCache = isConceptMap ? "<!--conceptmap-->\n" + currentMetadata.summary : currentMetadata.summary;
        await saveSummaryCache(currentMetadata.url, currentMetadata.title, summaryToCache, modelName, inputTokens, outputTokens, contentType);
        await saveUsageStats(inputTokens, outputTokens, contentType, modelName, Date.now() - generationStartMs, currentMetadata.title, currentMetadata.url, cacheTokens);
        
        updateTokenStats(inputTokens, outputTokens, {
            inputEstimated: false,
            outputEstimated: false
        });

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
 * Prefers err.status (set by callGeminiStream) over substring matching.
 */
function classifyError(err) {
    const msg = String(err?.message || err || "");
    const msgLower = msg.toLowerCase();
    const status = typeof err?.status === "number" ? err.status : null;

    // API key invalid or revoked (401/403)
    if (status === 401 || status === 403 || msgLower.includes("api key not valid")) {
        return {
            message: "La clau API no és vàlida o ha estat revocada. Comprova-la a la configuració.",
            showConfig: true
        };
    }

    // API key missing (no HTTP yet — surfaced from summary.js as an Error)
    if (!status && msgLower.includes("api key")) {
        return {
            message: msg,
            showConfig: true
        };
    }

    // Quota exceeded (429) — checked before generic 4xx so it gets its own message
    if (status === 429 || msgLower.includes("quota") || msgLower.includes("exhausted")) {
        return {
            message: "Tots els models alternatius han excedit la quota diària. Proveu-ho demà o afegiu més models favorits a la configuració.",
            showConfig: false
        };
    }

    // Service unavailable (5xx)
    if ((status && status >= 500) || msgLower.includes("service unavailable") || msgLower.includes("overloaded")) {
        return {
            message: "El servei de Gemini no està disponible ara mateix. Proveu-ho d'aquí a uns minuts.",
            showConfig: false
        };
    }

    // Model not found (404) — not a config issue, just the model is unavailable
    if (status === 404 || msgLower.includes("model not found") || msgLower.includes("model unavailable") || msgLower.includes("model is not available")) {
        return {
            message: "Cap dels models disponibles ha respost. Pot ser que els models triats no estiguin disponibles ara mateix. Proveu-ho més tard o canvieu els models favorits a la configuració.",
            showConfig: true
        };
    }

    // Permission errors (host permissions)
    if (msgLower.includes("permission") || msgLower.includes("access denied") || msgLower.includes("missing host permission")) {
        return {
            message: "No es pot accedir al contingut d'aquesta pàgina. Obre la configuració i concedeix permisos.",
            showConfig: true
        };
    }

    // Timeout or connection abort
    if (err.name === 'AbortError' || msgLower.includes('aborted') || msgLower.includes('timeout')) {
        return {
            message: "La petició ha expirat o s'ha interromput la connexió. Comprova la connexió i torna-ho a provar.",
            showConfig: false
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
    module.exports = { classifyError, buildFallbackList, startSummary };
}
