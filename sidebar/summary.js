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
function modelLabel(modelId) {
    const m = CURATED_MODELS.find(c => c.id === modelId);
    return (m && m.label) || modelId;
}

/**
 * L'usuari ha aturat la generació. NO és un error (abans anava al quadre
 * vermell role=alert, anunciat de manera assertiva): és un avís informatiu.
 * Si ja hi havia text en streaming, es mostra ben formatat i marcat com a
 * incomplet; si no, es deixa net i es desactiva l'exportació (no s'ha de poder
 * copiar/enviar a Obsidian el resum ANTERIOR ni un tros a mitges d'un mapa o
 * d'unes targetes, que no són text).
 */
function showUserAbort(ctx, receivedChunks) {
    const { contentDiv, errorDiv, currentMetadata } = ctx;
    const partial = receivedChunks ? currentMetadata.summary : "";
    let message;
    if (partial && isProseType(currentMetadata.type)) {
        contentDiv.replaceChildren(formatTextToFragment(partial, false));
        contentDiv.classList.remove("hidden");
        message = "Generació aturada: el resum és incomplet.";
    } else {
        contentDiv.replaceChildren();
        contentDiv.classList.add("hidden");
        currentMetadata.summary = "";
        message = "Generació aturada.";
    }
    if (typeof ctx.showModelNotice === "function") {
        ctx.showModelNotice(message);
    } else {
        errorDiv.textContent = message;
        errorDiv.classList.remove("hidden");
    }
    announceStatus(message);
}

function buildFallbackList(preferredModel, favoriteIds) {
    const globalFallbacks = CURATED_MODELS
        .filter(m => m.fallback === true)
        .map(m => m.id);
    return [...new Set([preferredModel, ...favoriteIds, ...globalFallbacks])];
}

// Únic punt on s'apliquen els estils biònics a #content. La mida ve en 'em'
// del select d'opcions, però com a font-size inline l''em' seria relatiu al
// PARE (#container), no als 14px de #content — per això s'ancora en px sobre
// la base real de #content (--content-base-size, sidebar.css). Tots els camins
// que estilen #content (toggle, streaming, historial) han de passar per aquí.
function applyBionicStyles(element, isEnabled, config = {}) {
    if (!element) return;
    if (isEnabled) {
        element.style.fontFamily = config.bionicFont || DEFAULT_BIONIC.font;
        let basePx = 14; // fallback: #content { font-size } a sidebar.css
        try {
            const v = parseFloat(getComputedStyle(element).getPropertyValue("--content-base-size"));
            if (v > 0) basePx = v;
        } catch (_e) { /* entorn de test sense getComputedStyle */ }
        const factor = parseFloat(config.bionicFontSize || DEFAULT_BIONIC.fontSize) || 1;
        element.style.fontSize = (basePx * factor) + "px";
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
/**
 * Adapta el prompt del mapa conceptual a la configuració (profunditat, branques,
 * descripcions). Es basa en tres ancoratges del text del prompt per defecte;
 * tests/default-prompts.test.mjs vigila que continuïn existint.
 */
function buildConceptMapPrompt(basePrompt, depth, branches, showDesc) {
    let prompt = basePrompt
        .replace(/Màxim \d+ nivells de profunditat\./, `Màxim ${depth} nivells de profunditat.`)
        .replace(/Segon nivell: \d+-\d+ branques principals\./, `Segon nivell: ${Math.max(3, branches - 2)}-${branches} branques principals.`);
    if (!showDesc) {
        prompt = prompt.replace(/9\. Opcionalment.*?: " \(dos punts \+ espai\)\.\n/, "");
    }
    return prompt;
}

// Preferències de format i llargada de la configuració de Resum (només tipus «summary»).
const STYLE_INSTRUCTIONS = {
    format: {
        bullets: "Instrucció addicional de format: presenta el resum com una llista de punts clau, amb un paràgraf introductori d'una sola frase com a molt.",
        tldr: "Instrucció addicional de format: dóna només un TL;DR de 2-3 frases, sense seccions ni llistes.",
        prose: "Instrucció addicional de format: redacta el resum com a prosa contínua en paràgrafs, sense llistes.",
    },
    length: {
        short: "Instrucció addicional de llargada: fes-lo molt breu (aproximadament 80 paraules).",
        long: "Instrucció addicional de llargada: fes-lo més detallat (aproximadament 400 paraules).",
    },
};

// Instruccions afegides al prompt pels refinadors ràpids de sota el resum.
const REFINE_INSTRUCTIONS = {
    shorter: "Instrucció addicional: fes el resultat molt més curt i concís que de costum, només l'essencial.",
    detailed: "Instrucció addicional: fes el resultat més detallat que de costum, amb més matisos, xifres i exemples del text.",
};

async function startSummary(ctx, overrideText = null, isDeepDive = false, isScience = false, isUserInitiated = false, isConceptMap = false, isSimple = false, isAnki = false, refine = null) {
    if (!overrideText && !isDeepDive && !isScience && !isConceptMap && !isSimple && !isAnki && !isUserInitiated) {
        return null;
    }

    const { contentDiv, errorDiv, modelSelect, currentMetadata } = ctx;
    const requestedType = isConceptMap ? "conceptmap" : isAnki ? "anki" : isScience ? "science" : isDeepDive ? "deepdive" : isSimple ? "simple" : "summary";

    // Si ara mateix hi ha la targeta d'onboarding (falta la clau), no l'esborrem:
    // un clic a Resumir la substituïa per un error [001] i l'usuari nou perdia
    // la guia fins a recarregar. (Sense await abans: l'abort ha de quedar
    // enganxat de manera síncrona, vegeu setAbortController.)
    const onboardingShown = !!(contentDiv.querySelector && contentDiv.querySelector(".api-key-warning-container"));
    if (!onboardingShown) {
        contentDiv.replaceChildren();
        contentDiv.classList.add("hidden");
    }
    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");
    
    let activeBtnId = "summarizeBtn";
    if (isDeepDive) activeBtnId = "deepDiveBtn";
    else if (isScience) activeBtnId = "scienceBtn";
    else if (isConceptMap) activeBtnId = "conceptMapBtn";
    else if (isSimple) activeBtnId = "explainSimpleBtn";
    else if (isAnki) activeBtnId = "ankiBtn";
    
    setGeneratingState(true, false, activeBtnId);
    
    const abortController = new AbortController();
    const signal = abortController.signal;
    let receivedChunks = false; // ja ha arribat text d'aquesta generació?
    if (typeof ctx.setAbortController === "function") ctx.setAbortController(abortController);

    const generationStartMs = startGenerationTimer();
    updateTokenStats(0, 0);  // Reset tokens display for new generation
    if (typeof hideProvenance === "function") hideProvenance();
    if (typeof hideRefiners === "function") hideRefiners();

    try {
        // 1. Get Configuration
        const [config, localSecrets] = await Promise.all([
            ext.storage.sync.get([
                "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "enableBionic",
                "enableDeepdive", "deepDivePrompt", "enableScience", "sciencePrompt",
                "enableSimple", "simplePrompt",
                "enableConceptMap", "enableAnki", "extensionOrder", "favoriteModels",
                "conceptMapPrompt", "conceptMapDepth", "conceptMapBranches", "conceptMapShowDescriptions",
                "conceptMapAutoExpand",
                "bionicFont", "bionicWeight", "bionicFontSize", "bionicLineHeight", "bionicFixation",
                "ankiPrompt", "ankiLang", "ankiPacket", "summaryFormat", "summaryLength"
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
        } else if (isAnki) {
            // Selecció de prompt Anki amb substitució d'idioma i quantitat de targetes
            const langName = (config.ankiLang || DEFAULT_ANKI_LANG) === "en" ? "English" : "català";
            const ankiCount = String(config.ankiPacket || DEFAULT_ANKI_PACKET);
            systemPrompt = (config.ankiPrompt || DEFAULT_ANKI_PROMPT)
                .replace(/\{\{LANG\}\}/g, langName)
                .replace(/\{\{COUNT\}\}/g, ankiCount);
        } else if (isConceptMap) {
            systemPrompt = buildConceptMapPrompt(
                config.conceptMapPrompt || DEFAULT_CONCEPTMAP_PROMPT,
                config.conceptMapDepth || 4,
                config.conceptMapBranches || 6,
                config.conceptMapShowDescriptions !== false
            );
        }

        // Preferències d'estil del Resum (la configuració les desa; «default»/«medium» no afegeixen res).
        if (requestedType === "summary") {
            const f = STYLE_INSTRUCTIONS.format[config.summaryFormat];
            const l = STYLE_INSTRUCTIONS.length[config.summaryLength];
            if (f) systemPrompt += "\n\n" + f;
            if (l) systemPrompt += "\n\n" + l;
        }

        // Refinador ràpid: instrucció afegida al prompt del tipus actual.
        if (refine && REFINE_INSTRUCTIONS[refine]) systemPrompt += "\n\n" + REFINE_INSTRUCTIONS[refine];

        applyExtensionVisibility(config);
        if (config.extensionOrder) {
            applyExtensionOrder(config.extensionOrder);
        }

        if (!apiKey) {
            throw new Error("[001] No s'ha configurat la clau d'API. Ves a la pàgina d'opcions de l'extensió.");
        }

        if (signal.aborted) {
            showUserAbort(ctx, false);
            return abortController;
        }

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
            } finally {
                // D'un sol ús: si no es neteja, un PDF local (o el preload de
                // pàgina inicial) queda "enganxat" i contamina resums posteriors.
                if (typeof ctx.clearContentPreload === "function") ctx.clearContentPreload();
            }
        }

        // Tornar a clicar el mateix mode quan ja es veu la versió de memòria cau
        // la regenera (refresca); un mode DIFERENT (o el primer clic) la reusa si
        // existeix, en lloc de gastar tokens per a res.
        const isRefresh = (!hasLocalPdf && currentMetadata.url === currentUrl && currentMetadata.fromCache && currentMetadata.type === requestedType);

        // El preload de la pàgina activa NO ha d'impedir reutilitzar la còpia desada (abans sí:
        // el primer clic regenerava sempre i gastava tokens); només els PDF locals en queden fora.
        if (!isRefresh && !refine && !hasLocalPdf && !overrideText) {
            const cachedEntry = await getSummaryCache(currentUrl, requestedType);
            if (cachedEntry && cachedEntry.summary) {
                currentMetadata.title = cachedEntry.title || tabs[0].title;
                currentMetadata.url = currentUrl;
                currentMetadata.summary = cachedEntry.summary;
                currentMetadata.fromCache = true;
                currentMetadata.type = requestedType;

                if (ctx.onPageIdentified) {
                    ctx.onPageIdentified(currentMetadata.title, currentMetadata.url);
                }

                const cachedSummary = cachedEntry.summary;
                const isCachedConceptMap = cachedSummary.startsWith("<!--conceptmap-->\n");
                const isCachedAnki = cachedSummary.startsWith("<!--anki-->\n");
                const displayText = isCachedConceptMap
                    ? cachedSummary.substring("<!--conceptmap-->\n".length)
                    : isCachedAnki
                        ? cachedSummary.substring("<!--anki-->\n".length)
                        : cachedSummary;
                // El resum «net» (sense el marcador intern) és el que s'exporta.
                currentMetadata.summary = displayText;

                if (isCachedConceptMap) {
                    contentDiv.replaceChildren(renderMarkmapInteractive(displayText, currentMetadata.title, currentMetadata.url));
                } else if (isCachedAnki) {
                    // Restaura l'estat Anki des de caché
                    setAnkiCards(parseAnkiCards(displayText));
                    renderAnkiPanel(buildAnkiCtx(ctx));
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
        currentMetadata.type = requestedType;

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
        // Vídeo amb marques de temps: el resum cita [m:ss] i enllaça amb el moment.
        if (isProseType(requestedType) && /\[\d+:\d{2}(?::\d{2})?\] /.test(String(pageData.text || ""))) {
            systemPrompt += "\n\nEl text conté marques de temps [m:ss]. Quan una idea provingui d'un moment concret del vídeo, afegeix al final del punt la marca on comença, copiada tal com surt al text. Una sola marca per punt, sense intervals; no n'inventis cap.";
        }
        // PDF amb marques de pàgina: demanem citar-les perquè el resum enllaci amb el document.
        if (isProseType(requestedType) && /^\[Pàgina 1\]/.test(String(pageData.text || ""))) {
            systemPrompt += "\n\nEl text conté marques [Pàgina N]. Quan una idea provingui d'una pàgina concreta, afegeix al final del punt la cita (p. N), amb el número de la marca [Pàgina N] i no el número imprès al document. Si ve de diverses pàgines, posa una cita per pàgina, p. ex. (p. 3) (p. 5), mai intervals.";
        }
        // Desa el text brut per a la regeneració Anki (Task 6). Guard per a tests Node.
        if (typeof window !== "undefined") window.__ankiPageText = pageData.text;

        if (signal.aborted) {
            errorDiv.textContent = "Generació aturada per l'usuari.";
            errorDiv.classList.remove("hidden");
            return abortController;
        }

        // Token Limit handling — recalculat PER MODEL dins del bucle de sota
        // (truncateForModel), no un sol cop per al model preferit: si el
        // fallback canvia a un model amb un context window més petit, un
        // prompt truncat només per al primer podia seguir sent massa gran →
        // HTTP 400 no reintentable, que trencava tota la cadena de fallback.
        // Nota: s'usa CURATED_MODELS.find() directament (no getCuratedModelInfo)
        // per evitar dep. creuada amb api.js en tests.
        // El ratio chars/token canvia de 3.5 (original) a 4 per aproximació més precisa per Gemini.
        let wasTruncated = false;
        function truncateForModel(text, modelId) {
            const modelEntry = CURATED_MODELS.find(m => m.id === modelId);
            const safeLimit = Math.floor(((modelEntry && modelEntry.contextWindow) || 200_000) * 0.8);
            if (estimateTokens(text) > safeLimit) {
                wasTruncated = true;
                const charLimit = safeLimit * 4; // ~4 chars/token (abans era 3.5 — intencionadament canviat)
                // El tall pot caure abans del tancament </UNTRUSTED_CONTENT> del
                // wrapper (unes línies més amunt) — el reafegim explícitament
                // perquè el bloc no quedi mai obert de cara al model.
                return text.substring(0, charLimit) + "\n\n[... Text truncated due to model limits ...]\n</UNTRUSTED_CONTENT>";
            }
            return text;
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
        let sawQuotaError = false;
        const preferredModel = modelName;
        let preferredFailedByQuota = false;
        const EXHAUSTED_TTL_MS = 5 * 60 * 1000;
        // Models que han donat 429 fa poc (memòria de la sessió, la posa el
        // cridant): se salten de primeres perquè cada petició no hagi de
        // fallar primer amb el mateix. Si cap és vàlid, es proven tots.
        const exhausted = ctx.exhaustedModels instanceof Map ? ctx.exhaustedModels : null;
        const freshModels = modelsToTry.filter(m => !(exhausted && exhausted.get(m) > Date.now()));
        const candidates = freshModels.length > 0 ? freshModels : modelsToTry;
        if (typeof ctx.showModelNotice === "function") ctx.showModelNotice("");
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
        // Estimació inicial per a la UI amb el model preferit; el prompt
        // real enviat a cada intent es recalcula per model dins del bucle.
        let lastPromptText = truncateForModel(pageText, modelName);
        const liveInputTokens = estimateTokens(lastPromptText);
        let liveOutputTokens = 0;
        let lastTokenUiUpdate = 0;

        updateTokenStats(liveInputTokens, liveOutputTokens, {
            inputEstimated: true,
            outputEstimated: true
        });

        for (const tryModel of candidates) {
            if (signal.aborted) break;
            try {
                currentMetadata.summary = pageData.noTranscript ? "Vídeo sense transcripció.\n\n" : ""; // Reset output text
                liveOutputTokens = 0;
                const loadingDiv = document.getElementById("loading");
                setLoadingStage(tryModel === preferredModel
                    ? `Enviant a ${modelLabel(tryModel)}…`
                    : `Provant ${modelLabel(tryModel)} (${modelLabel(preferredModel)} no ha respost)…`);
                lastPromptText = truncateForModel(pageText, tryModel);
                apiUsage = await callGeminiStream(apiKey, tryModel, systemPrompt, lastPromptText, signal, (chunkText) => {
                    // Amagar els puntets en el primer chunk rebut
                    if (loadingDiv && !loadingDiv.classList.contains("hidden")) {
                        loadingDiv.classList.add("hidden");
                    }
                    receivedChunks = true;
                    currentMetadata.summary += chunkText;
                    const now = Date.now();
                    // Markdown formatat mentre arriba (abans: text cru amb **, # i
                    // un salt de maquetació en acabar). Es limita la freqüència i
                    // s'espaia més en textos llargs, perquè re-analitzar tot el
                    // text a cada chunk seria quadràtic.
                    const interval = 250 + Math.floor(currentMetadata.summary.length / 20000) * 250;
                    if (now - lastUpdate > interval || lastUpdate === 0) {
                        if (isAnki || isConceptMap) {
                            // L'esquema/JSON a mitges no és text per llegir: només progrés.
                            contentDiv.textContent = isAnki ? "Generant targetes…" : "Generant el mapa…";
                        } else {
                            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, false));
                        }
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
                // El model que ha respost (per a caché i estadístiques). NO es
                // desa com a preferit: un 429 passatger no ha de canviar
                // l'elecció de l'usuari; només se l'avisa.
                modelName = tryModel;
                if (exhausted) exhausted.delete(tryModel);
                if (tryModel !== preferredModel && typeof ctx.showModelNotice === "function") {
                    const reason = preferredFailedByQuota ? "ha esgotat la quota" : "no ha respost";
                    ctx.showModelNotice(`S'ha usat ${modelLabel(tryModel)} perquè ${modelLabel(preferredModel)} ${reason}.`);
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
                        e.name === "TimeoutError" ||
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
                    const isQuota = status === 429 || msg.includes("quota") || msg.includes("exhausted");
                    if (isQuota) {
                        sawQuotaError = true;
                        if (exhausted) exhausted.set(tryModel, Date.now() + EXHAUSTED_TTL_MS);
                        if (tryModel === preferredModel) preferredFailedByQuota = true;
                    }
                    continue;
                }
                throw e; // Other unexpected errors (auth, network, etc.)
            }
        }

        // Guard defensiu: avui inabastable perquè el check de la línia de dalt
        // (abans del bucle) ja intercepta l'abort sense cap await pel mig, i
        // un abort DINS d'un intent ja el rellança el catch de sota. Es manté
        // per si un futur canvi introdueix un await entre iteracions del bucle
        // — sense això, cauria en un render+cache d'un resum buit en silenci.
        if (signal.aborted) {
            showUserAbort(ctx, receivedChunks);
            return abortController;
        }

        if (!success && lastError) {
            // Només diem «quota» si algun intent ha topat amb quota; si no, el
            // missatge ha de reflectir l'error real (503, timeout, 404…), no
            // dir «torna demà» davant d'una caiguda passatgera del servei.
            if (sawQuotaError) {
                throw new Error("[003] Tots els models disponibles han fallat (manca de quota). Si us plau, proveu-ho més tard.");
            }
            throw lastError;
        }

        // Sense targetes vàlides, no hi ha res útil a mostrar ni a cachejar
        // (cachejar-ho igualment deixava una entrada d'Historial permanentment
        // trencada, sense manera de tornar-la a generar des d'allà).
        const ankiCardsParsed = isAnki ? parseAnkiCards(currentMetadata.summary) : null;
        const ankiHasNoCards = isAnki && ankiCardsParsed.length === 0;

        if (isConceptMap) {
            contentDiv.replaceChildren(renderMarkmapInteractive(currentMetadata.summary, currentMetadata.title, currentMetadata.url));
        } else if (isAnki) {
            if (ankiHasNoCards) {
                // «[]» és la resposta que el prompt demana quan no hi ha prou contingut.
                errorDiv.textContent = /^\s*\[\s*\]\s*$/.test(currentMetadata.summary)
                    ? "No hi ha prou contingut per fer targetes."
                    : "El model no ha retornat cap targeta vàlida. Prova de tornar a generar.";
                errorDiv.classList.remove("hidden");
            } else {
                // Desvia el render al panell Anki interactiu
                setAnkiCards(ankiCardsParsed);
                renderAnkiPanel(buildAnkiCtx(ctx));
            }
        } else {
            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary, bionicEnabled, bionicFixation));
        }

        applyBionicStyles(contentDiv, bionicEnabled, config);
        if (typeof linkYoutubeTimes === "function" && isProseType(requestedType)) linkYoutubeTimes(contentDiv, currentMetadata.url);
        if (typeof linkPdfPages === "function" && isProseType(requestedType)) linkPdfPages(contentDiv, currentMetadata.url);

        setGeneratingState(false, true);

        // 4. Update Stats & Cache
        // apiUsage is null if the stream failed mid-flight or the API returned no usageMetadata.
        // Fall back to character-based estimates in those cases.
        const inputTokens  = apiUsage?.inputTokens  ?? lastPromptText.length / 4;
        const outputTokens = apiUsage?.outputTokens ?? currentMetadata.summary.length / 4;
        const cacheTokens  = apiUsage?.cacheTokens  ?? 0;

        announceStatus("Resum complet.");
        const contentType = isConceptMap ? "conceptmap" : isAnki ? "anki" : isScience ? "science" : isDeepDive ? "deepdive" : isSimple ? "simple" : "summary";
        const summaryToCache = isConceptMap ? "<!--conceptmap-->\n" + currentMetadata.summary
            : isAnki ? "<!--anki-->\n" + currentMetadata.summary
            : currentMetadata.summary;
        if (!ankiHasNoCards) {
            await saveSummaryCache(currentMetadata.url, currentMetadata.title, summaryToCache, modelName, inputTokens, outputTokens, contentType);
        }
        await saveUsageStats(inputTokens, outputTokens, contentType, modelName, Date.now() - generationStartMs, currentMetadata.title, currentMetadata.url, cacheTokens);
        
        updateTokenStats(inputTokens, outputTokens, {
            inputEstimated: false,
            outputEstimated: false
        });
        if (typeof showRefiners === "function" && isProseType(contentType)) showRefiners();
        if (typeof renderProvenance === "function") {
            renderProvenance({
                words: String(pageData.text || "").trim().split(/\s+/).filter(Boolean).length,
                model: modelName,
                inputTokens,
                outputTokens,
                truncated: wasTruncated || pageData.truncated === true,
                cookieBanner: typeof looksLikeCookieBanner === "function" && looksLikeCookieBanner(pageData.text),
            });
        }

    } catch (err) {
        // Només és una aturada de l'usuari si el SEU signal s'ha avortat: un
        // AbortError sense això ve del timeout d'inactivitat (o de la xarxa).
        if (signal.aborted) {
            showUserAbort(ctx, receivedChunks);
        } else {
            stopGenerationTimer("error");
            // Falta la clau i la targeta d'onboarding ja ho diu (amb el botó
            // per configurar-la): no hi afegim un error vermell redundant.
            if (onboardingShown && /^\[001\]/.test(err?.message || "")) {
                return abortController;
            }
            const errorInfo = classifyError(err);
            errorDiv.textContent = errorInfo.message;
            errorDiv.classList.remove("hidden");

            if (errorInfo.showConfig) {
               const btn = document.createElement("button");
               btn.textContent = "Configurar";
               btn.className = "btn-primary";
               btn.style.marginTop = "10px";
               btn.onclick = () => openSettings({ tab: "general", focus: "apiKey" });
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
    if (!status && (msgLower.includes("api key") || msgLower.includes("clau d'api"))) {
        return {
            message: msg,
            showConfig: true
        };
    }

    // Quota exceeded (429) — checked before generic 4xx so it gets its own message
    if (status === 429 || msgLower.includes("quota") || msgLower.includes("exhausted")) {
        return {
            message: "Tots els models alternatius han excedit la quota diària. Prova-ho demà o afegeix més models favorits a la configuració.",
            showConfig: false
        };
    }

    // Service unavailable (5xx)
    if ((status && status >= 500) || msgLower.includes("service unavailable") || msgLower.includes("overloaded")) {
        return {
            message: "El servei de Gemini no està disponible ara mateix. Prova-ho d'aquí a uns minuts.",
            showConfig: false
        };
    }

    // Model not found (404) — not a config issue, just the model is unavailable
    if (status === 404 || msgLower.includes("model not found") || msgLower.includes("model unavailable") || msgLower.includes("model is not available")) {
        return {
            message: "Cap dels models disponibles ha respost. Pot ser que els models triats no estiguin disponibles ara mateix. Prova-ho més tard o canvia els models favorits a la configuració.",
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
    if (err.name === 'TimeoutError' || err.name === 'AbortError' || msgLower.includes('aborted') || msgLower.includes('timeout')) {
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

/**
 * Construeix el ctx del panell Anki a partir del ctx de summary.
 * onGenerateMore delega a generateMoreAnkiCards (implementat a la Task 6).
 */
function buildAnkiCtx(ctx) {
    return {
        contentDiv: ctx.contentDiv,
        errorDiv: ctx.errorDiv,
        getGlobalConfig: ctx.getGlobalConfig,
        onGenerateMore: (focusText) => generateMoreAnkiCards(ctx, focusText),
    };
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { buildConceptMapPrompt, classifyError, buildFallbackList, startSummary, buildAnkiCtx };
}
