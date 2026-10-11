/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// sidebar/api.js
// Handles all communication with the Gemini API.
// CURATED_MODELS, DEFAULT_MODEL_INFO and EUR_RATE come from shared/models.js
// (loaded before this file in the sidebar bundle).

/** Cap d'una resposta més gran que això (en bytes acumulats) avorta el stream. */
const MAX_STREAM_BYTES = 5 * 1024 * 1024;

/**
 * Timeout d'INACTIVITAT (es reinicia a cada chunk rebut), no un deadline fix
 * des de l'inici. Cobreix tant l'espera de les capçaleres HTTP com el cos de
 * l'streaming — un stream que s'encalla a mig camí (connexió oberta, servidor
 * que deixa d'enviar dades) també queda protegit.
 */
const STREAM_IDLE_TIMEOUT_MS = 60_000;

/**
 * Returns curated model info (prices in EUR, rpd) for a given model ID.
 * Falls back to DEFAULT_MODEL_INFO for unknown models.
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
    return {
        label:         modelId,
        priceIn:       DEFAULT_MODEL_INFO.priceIn  * EUR_RATE,
        priceOut:      DEFAULT_MODEL_INFO.priceOut * EUR_RATE,
        rpd:           DEFAULT_MODEL_INFO.rpd,
        contextWindow: DEFAULT_MODEL_INFO.contextWindow
    };
}

/**
 * Calls the Gemini API using streaming (Server-Sent Events).
 *
 * On HTTP failure, throws an Error whose `.status` is the HTTP status code,
 * letting callers classify retryability without parsing the message string.
 */
async function callGeminiStream(apiKey, modelName, systemPrompt, text, signal, onChunk, onUsage) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:streamGenerateContent?alt=sse`;

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

    // Combine user abort signal with an IDLE timeout (es reinicia a cada
    // chunk via resetIdleTimeout, no és un deadline únic des de l'inici).
    // El signal d'usuari és optatiu (p.ex. la regeneració de targetes Anki no
    // en passa cap), així que filtrem els buits abans de combinar:
    // AbortSignal.any() peta amb undefined.
    // S'avorta amb un motiu `TimeoutError`: fetch()/reader.read() rebutgen amb
    // el `reason` del signal, i així el cridant pot distingir un timeout
    // d'una aturada de l'usuari (`AbortError`) en lloc de culpar-lo.
    const timeoutController = new AbortController();
    const abortOnIdle = () => timeoutController.abort(
        new DOMException("Idle timeout", "TimeoutError")
    );
    let idleTimeoutId = setTimeout(abortOnIdle, STREAM_IDLE_TIMEOUT_MS);
    function resetIdleTimeout() {
        clearTimeout(idleTimeoutId);
        idleTimeoutId = setTimeout(abortOnIdle, STREAM_IDLE_TIMEOUT_MS);
    }
    const signals = [signal, timeoutController.signal].filter(Boolean);
    const fetchSignal = (typeof AbortSignal.any === 'function')
        ? AbortSignal.any(signals)
        : signal;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey
            },
            body: JSON.stringify(body),
            signal: fetchSignal
        });
        // Capçaleres rebudes — reinicia el rellotge per a l'streaming del cos.
        resetIdleTimeout();

        if (!response.ok) {
            let errorMsg = response.statusText;
            try {
                const errorData = await response.json();
                errorMsg = errorData.error?.message || errorMsg;
            } catch(e) {}
            const err = new Error(`[007] Error API (${response.status}): ${errorMsg}`);
            err.status = response.status;
            throw err;
        }

        // Reject responses whose body is not the SSE stream we expect. A reverse
        // proxy or captive portal returning HTML would otherwise feed garbage to
        // the JSON parser line-by-line.
        const ct = response.headers.get("content-type") || "";
        if (!ct.includes("text/event-stream")) {
            throw new Error(`[009] Resposta inesperada del servidor (Content-Type: ${ct || "absent"}).`);
        }

        if (!response.body) throw new Error("[008] ReadableStream not supported");

        const reader = response.body.getReader();
        const decoder = new TextDecoder("utf-8");
        let buffer = "";
        let lastUsageMeta = null;
        let totalBytes = 0;

        function processLine(line) {
            if (line.trim() === "") return;
            if (!line.startsWith("data: ")) return;
            const jsonStr = line.slice(6);
            if (jsonStr === "[DONE]") return;

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

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                resetIdleTimeout(); // ha arribat un chunk — el stream és viu

                totalBytes += value?.byteLength || 0;
                if (totalBytes > MAX_STREAM_BYTES) {
                    // Defence against runaway responses (proxy injection, mistuned
                    // model returning gigabytes). 5 MB covers any normal summary.
                    try { reader.cancel(); } catch (_e) {}
                    throw new Error("[010] Stream massa gran; petició cancel·lada per seguretat.");
                }

                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split("\n");
                buffer = lines.pop();
                lines.forEach(processLine);
            }
            // Flush final: decodifica qualsevol seqüència UTF-8 pendent al
            // decoder i processa l'última línia del buffer — Gemini sempre
            // tanca l'SSE amb una línia en blanc, però no ens ho podem
            // permetre donar per fet (un altre servidor/proxy podria no
            // fer-ho i perdríem silenciosament l'últim event).
            buffer += decoder.decode();
            processLine(buffer);
        } finally {
            try { reader.releaseLock(); } catch (_e) {}
        }

        return {
            inputTokens:  lastUsageMeta?.promptTokenCount           ?? 0,
            outputTokens: lastUsageMeta?.candidatesTokenCount        ?? 0,
            cacheTokens:  lastUsageMeta?.cachedContentTokenCount     ?? 0,
        };
    } finally {
        clearTimeout(idleTimeoutId);
    }
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
/**
 * Neteja el que l'usuari enganxa com a clau: espais i salts de línia, cometes
 * i el prefix «Bearer » (error habitual en copiar d'un exemple de capçalera).
 */
function normalizeApiKey(raw) {
    if (typeof raw !== "string") return "";
    return raw.trim().replace(/^["']|["']$/g, "").replace(/^Bearer\s+/i, "").trim();
}

/** Les claus de Google AI Studio comencen per «AIza»; només és un avís, no un bloqueig. */
function looksLikeGeminiKey(key) {
    return /^AIza[0-9A-Za-z_-]{30,}$/.test(key);
}

/**
 * Tradueix el resultat de la comprovació de clau a un missatge accionable.
 * @param {number|null} status HTTP, o null si no hi ha hagut resposta (xarxa)
 */
function describeKeyCheck(status) {
    if (status === null) return { ok: false, message: "No s'ha pogut connectar amb Google. Comprova la connexió i torna-ho a provar." };
    if (status >= 200 && status < 300) return { ok: true, message: "Clau vàlida." };
    if (status === 400) return { ok: false, message: "La clau no és vàlida. Torna-la a copiar de Google AI Studio." };
    if (status === 401 || status === 403) return { ok: false, message: "Google ha rebutjat la clau (sense permís o l'API de Gemini no està habilitada). Crea'n una de nova a AI Studio." };
    if (status === 429) return { ok: false, message: "Has arribat al límit gratuït de peticions. Espera uns minuts i torna-ho a provar." };
    if (status >= 500) return { ok: false, message: "El servei de Gemini no està disponible ara mateix. Prova-ho d'aquí a uns minuts." };
    return { ok: false, message: `Google ha respost amb un error inesperat (${status}).` };
}

/**
 * Comprova una clau amb una consulta barata (llistar models, sense generar
 * res). Retorna { ok, message }.
 */
async function verifyApiKey(rawKey) {
    const key = normalizeApiKey(rawKey);
    if (!key) return { ok: false, message: "Enganxa primer la clau." };
    try {
        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", {
            headers: { "x-goog-api-key": key },
        });
        return { ...describeKeyCheck(response.status), key };
    } catch (_e) {
        return describeKeyCheck(null);
    }
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = { getCuratedModelInfo, callGeminiStream, normalizeApiKey, looksLikeGeminiKey, describeKeyCheck, verifyApiKey };
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

        // Mostrar només els favorits de l'usuari, ordenats per prioritat
        const modelsToShow = sortModelsByPriority(
            favoriteIds
                .map(id => cachedModels.find(m => m.id === id))
                .filter(Boolean)
        );

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
