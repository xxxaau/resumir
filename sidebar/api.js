// sidebar/api.js
// Handles all communication with the Gemini API
// CURATED_MODELS is defined in shared/models.js (loaded before this file)
// EUR_RATE is defined in shared/models.js (loaded before this file)

/**
 * Returns curated model info (prices in EUR, rpd) for a given model ID.
 * Falls back to generic Flash defaults for unknown models.
 */
function getCuratedModelInfo(modelId) {
    const found = CURATED_MODELS.find(m => modelId && (
        m.id === modelId ||
        modelId === m.id + "-exp" ||
        modelId === m.id + "-preview" ||
        modelId === m.id + "-latest"
    ));
    if (found) {
        return {
            label:         found.label,
            priceIn:       found.priceIn  * EUR_RATE,
            priceOut:      found.priceOut * EUR_RATE,
            rpd:           found.rpd,
            contextWindow: found.contextWindow
        };
    }
    return { label: modelId, priceIn: 0.10 * EUR_RATE, priceOut: 0.40 * EUR_RATE, rpd: 1500 };
}

/**
 * Calls the Gemini API using streaming (Server-Sent Events)
 */
async function callGeminiStream(apiKey, modelName, systemPrompt, text, signal, onChunk, onUsage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?alt=sse`;
    
    let body;

    if (modelName.toLowerCase().includes("gemma")) {
        body = {
            contents: [{
                parts: [{
                    text: `${systemPrompt}\n\nTasks:\n${text}`
                }]
            }]
        };
    } else {
        body = {
            system_instruction: {
                parts: { text: systemPrompt }
            },
            contents: [{
                parts: [{
                    text: text
                }]
            }]
        };
    }

    // Combine user abort signal with a 60s timeout
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), 60_000);
    const fetchSignal = (typeof AbortSignal.any === 'function')
        ? AbortSignal.any([signal, timeoutController.signal])
        : signal;

    let response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(body),
            signal: fetchSignal
        });
    } finally {
        clearTimeout(timeoutId);
    }

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
        } catch(e) {}
        throw new Error(`[007] Error API (${response.status}): ${errorMsg}`);
    }

    if (!response.body) throw new Error("[008] ReadableStream not supported");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let lastUsageMeta = null;

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop();

        for (const line of lines) {
            if (line.trim() === "") continue;
            if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6);
                if (jsonStr === "[DONE]") continue;

                try {
                    const data = JSON.parse(jsonStr);
                    const parts = data.candidates?.[0]?.content?.parts ?? [];
                    for (const part of parts) {
                        if (part.thought) continue; // thinking models: skip reasoning tokens
                        if (part.text) onChunk(part.text);
                    }
                    if (data.usageMetadata) {
                        lastUsageMeta = data.usageMetadata;
                        if (typeof onUsage === "function") {
                            onUsage(lastUsageMeta);
                        }
                    }
                } catch (e) {
                    console.warn("Error parsing stream JSON", e);
                }
            }
        }
    }

    return {
        inputTokens:  lastUsageMeta?.promptTokenCount           ?? 0,
        outputTokens: lastUsageMeta?.candidatesTokenCount        ?? 0,
        cacheTokens:  lastUsageMeta?.cachedContentTokenCount     ?? 0,
    };
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getCuratedModelInfo, callGeminiStream };
}

/**
 * Loads favorite models into the sidebar select.
 * Shows only user favorites (from storage.sync.favoriteModels).
 * If no favorites, falls back to CURATED_MODELS.
 * Always adds "Triar més models..." as last option to open settings.
 */
async function loadModels(apiKey, currentModel) {
    const modelSelect = document.getElementById("model-select");
    
    try {
        if (modelSelect.options.length === 0) {
           const loadingOpt = document.createElement("option");
           loadingOpt.textContent = "Carregant ...";
           modelSelect.appendChild(loadingOpt);
        }

        // Load favorites and cached model list
        const [favoriteIds, localData] = await Promise.all([
            ensureFavoriteModels(),
            ext.storage.local.get(["availableModels"])
        ]);

        const cachedModels = (localData.availableModels && localData.availableModels.length > 0)
            ? localData.availableModels
            : CURATED_MODELS.map(cm => ({ id: cm.id, label: cm.label, curated: true }));

        modelSelect.replaceChildren();

        // Mostrar només els favorits de l'usuari
        const modelsToShow = favoriteIds
            .map(id => cachedModels.find(m => m.id === id))
            .filter(Boolean);

        modelsToShow.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m.id;
            opt.textContent = m.label || m.id;
            modelSelect.appendChild(opt);
        });

        // Keep saved model even if not in the list (user preference)
        if (currentModel && !modelsToShow.find(m => m.id === currentModel)) {
            const opt = document.createElement("option");
            opt.value = currentModel;
            opt.textContent = currentModel;
            modelSelect.insertBefore(opt, modelSelect.firstChild);
        }

        // "Triar més models..." — opens settings page
        const sep = document.createElement("option");
        sep.disabled = true;
        sep.textContent = "──────────";
        modelSelect.appendChild(sep);

        const moreOpt = document.createElement("option");
        moreOpt.value = "__open_settings__";
        moreOpt.textContent = "Triar més models…";
        modelSelect.appendChild(moreOpt);

        // Seleccionar el model actual o el per defecte
        if (currentModel && modelsToShow.find(m => m.id === currentModel)) {
            modelSelect.value = currentModel;
        } else if (modelsToShow.length > 0) {
            // Si no hi ha model actual, seleccionar el primer (que és el per defecte)
            modelSelect.value = modelsToShow[0].id;
        }
        
    } catch (e) {
        console.error("Error loading models:", e);
        // Static fallback: show all curated models
        if (modelSelect.options.length <= 1) {
            modelSelect.replaceChildren();
            CURATED_MODELS.forEach(cm => {
                const opt = document.createElement("option");
                opt.value = cm.id;
                opt.textContent = cm.label;
                modelSelect.appendChild(opt);
            });
            if (currentModel) modelSelect.value = currentModel;
        }
    }
}
