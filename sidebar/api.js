// sidebar/api.js
// Handles all communication with the Gemini API

/**
 * Calls the Gemini API using streaming (Server-Sent Events)
 */
async function callGeminiStream(apiKey, modelName, systemPrompt, text, signal, onChunk) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:streamGenerateContent?key=${apiKey}&alt=sse`;
    
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: signal
    });

    if (!response.ok) {
        let errorMsg = response.statusText;
        try {
            const errorData = await response.json();
            errorMsg = errorData.error?.message || errorMsg;
        } catch(e) {}
        throw new Error(`Error API (${response.status}): ${errorMsg}`);
    }

    if (!response.body) throw new Error("ReadableStream not supported");

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

/**
 * Loads available models from the Gemini API and populates the select element
 */
async function loadModels(apiKey, currentModel) {
    const modelSelect = document.getElementById("model-select");
    
    try {
        if (modelSelect.options.length === 0) {
           const loadingOpt = document.createElement("option");
           loadingOpt.textContent = "Carregant ...";
           modelSelect.appendChild(loadingOpt);
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error("Failed to fetch models");
        const data = await response.json();
        
        const validModels = data.models
            .filter(m => 
                m.supportedGenerationMethods?.includes("generateContent") &&
                (m.name.includes("gemini") || m.name.includes("gemma")) &&
                !/embedding|aqa|robotics|vision|image/i.test(m.name)
            )
            .map(m => m.name.replace("models/", ""));

        const preferred = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.5-pro", "gemini-2.0-flash-lite-preview-02-05", "gemini-2.0-pro-exp-02-05", "gemma-3-27b-it", "gemini-1.5-flash-latest"];
        
        validModels.sort((a, b) => {
            const idxA = preferred.indexOf(a);
            const idxB = preferred.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        modelSelect.replaceChildren();
        validModels.forEach(m => {
            const opt = document.createElement("option");
            opt.value = m;
            let displayName = m.replace("gemini-", "").replace("gemma-", "gemma ");
            if (m === "gemini-1.5-flash-latest") displayName = "Gemini 1.5 Flash (Latest)";
            else if (m === "gemini-2.5-flash") displayName = "Gemini 2.5 Flash";
            else if (m === "gemini-2.0-flash") displayName = "Gemini 2.0 Flash";
            else if (m.includes("flash-lite")) displayName = "Gemini 2.0 Flash Lite";
            else if (m === "gemma-3-27b-it") displayName = "Gemma 3 27B";
            else displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            
            opt.textContent = displayName;
            modelSelect.appendChild(opt);
        });
        
        if (currentModel && !validModels.includes(currentModel)) {
             const opt = document.createElement("option");
             opt.value = currentModel;
             opt.textContent = currentModel;
             modelSelect.appendChild(opt);
        }
        
        if (currentModel) modelSelect.value = currentModel;
        
    } catch (e) {
        console.error("Error loading models:", e);
        if (modelSelect.options.length <= 1) {
            modelSelect.replaceChildren();
            const fallbackModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite-preview-02-05", "gemma-3-27b-it"];
            fallbackModels.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m;
                let name = m;
                if (m === "gemini-2.5-flash") name = "Gemini 2.5 Flash";
                else if (m === "gemini-2.0-flash") name = "Gemini 2.0 Flash";
                else if (m.includes("flash-lite")) name = "Gemini 2.0 Flash Lite";
                
                opt.textContent = name;
                modelSelect.appendChild(opt);
            });
            if (currentModel) modelSelect.value = currentModel;
        }
    }
}
