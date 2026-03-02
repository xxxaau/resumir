// sidebar/api.js
// Handles all communication with the Gemini API

const EUR_RATE = 0.92; // USD → EUR fixed conversion rate

// Curated model list: only these 5 are shown, in priority order
const CURATED_MODELS = [
    { id: "gemini-2.5-pro",            label: "Gemini 2.5 Pro",       priceIn: 1.25, priceOut: 5.00,  rpd: 50    },
    { id: "gemini-2.0-flash",          label: "Gemini 2.0 Flash",      priceIn: 0.10, priceOut: 0.40,  rpd: 1500  },
    { id: "gemini-2.5-flash",          label: "Gemini 2.5 Flash",      priceIn: 0.30, priceOut: 2.50,  rpd: 500   },
    { id: "gemma-3-27b-it",            label: "Gemma 3 (27B)",         priceIn: 0.15, priceOut: 0.15,  rpd: 2000  },
    { id: "gemini-2.0-flash-lite",     label: "Gemini 2.0 Flash Lite", priceIn: 0.07, priceOut: 0.30,  rpd: 999999},
];

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
            label:    found.label,
            priceIn:  found.priceIn  * EUR_RATE,
            priceOut: found.priceOut * EUR_RATE,
            rpd:      found.rpd
        };
    }
    return { label: modelId, priceIn: 0.10 * EUR_RATE, priceOut: 0.40 * EUR_RATE, rpd: 1500 };
}

/**
 * Calls the Gemini API using streaming (Server-Sent Events)
 */
async function callGeminiStream(apiKey, modelName, systemPrompt, text, signal, onChunk) {
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },
      body: JSON.stringify(body),
      signal: signal
    });

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
                    const part = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (part) {
                        onChunk(part);
                    }
                } catch (e) {
                    console.warn("Error parsing stream JSON", e);
                }
            }
        }
    }
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = { getCuratedModelInfo, CURATED_MODELS };
}

/**
 * Loads available models from the Gemini API and populates the select element.
 * Fetches from API and filters to only show the 5 curated models (in priority order).
 * Falls back to static curated list if the API is unreachable.
 */
async function loadModels(apiKey, currentModel) {
    const modelSelect = document.getElementById("model-select");
    
    try {
        if (modelSelect.options.length === 0) {
           const loadingOpt = document.createElement("option");
           loadingOpt.textContent = "Carregant ...";
           modelSelect.appendChild(loadingOpt);
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
            headers: { "x-goog-api-key": apiKey }
        });
        if (!response.ok) throw new Error("[009] Failed to fetch models");
        const data = await response.json();
        
        // Always show all curated models in fixed priority order
        // (API call above validates connectivity but doesn't filter the list)
        const toShow = CURATED_MODELS;

        modelSelect.replaceChildren();
        toShow.forEach(cm => {
            const opt = document.createElement("option");
            opt.value = cm.id;
            opt.textContent = cm.label;
            modelSelect.appendChild(opt);
        });

        // Keep saved model even if not in curated list (user preference)
        if (currentModel && !toShow.find(m => m.id === currentModel)) {
            const opt = document.createElement("option");
            opt.value = currentModel;
            opt.textContent = currentModel;
            modelSelect.appendChild(opt);
        }
        
        if (currentModel) modelSelect.value = currentModel;
        
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
