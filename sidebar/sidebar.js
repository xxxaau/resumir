document.addEventListener("DOMContentLoaded", () => {

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
  const contentDiv = document.getElementById("content");
  const loadingDiv = document.getElementById("loading");
  const errorDiv = document.getElementById("error");
  const summarizeBtn = document.getElementById("summarizeBtn");

  const copyBtn = document.getElementById("copyBtn");
  const settingsBtn = document.getElementById("settingsBtn");

  let isGenerating = false;
  const PLAY_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
  const PAUSE_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
  const CHECK_ICON_STR = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" color="#28a745"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

  const parser = new DOMParser();
  const getIcon = (str) => parser.parseFromString(str, 'image/svg+xml').documentElement;

  let abortController = null;
  // Store metadata for markdown export
  let currentMetadata = { title: "", url: "", summary: "", fromCache: false };
  let contentPreload = null; // Promise for speculative loading

  // Models will be loaded dynamically via API

  // Initial Visibility Check
  browser.storage.local.get(["enableMarkdown", "enableObsidian"]).then(config => {
      const copyBtn = document.getElementById("copyBtn");
      const obsidianBtn = document.getElementById("obsidianBtn");
      
      if (config.enableMarkdown === false) copyBtn.style.display = "none";
      if (config.enableObsidian === false) obsidianBtn.style.display = "none"; // Default visible if not disabled
  });

  // Listen for configuration changes
  browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'local') {
          if (changes.enableMarkdown) {
              const copyBtn = document.getElementById("copyBtn");
              if (changes.enableMarkdown.newValue === false) copyBtn.style.display = "none";
              else copyBtn.style.display = "flex";
          }
          if (changes.enableObsidian) {
              const obsidianBtn = document.getElementById("obsidianBtn");
              if (changes.enableObsidian.newValue === false) obsidianBtn.style.display = "none";
              else obsidianBtn.style.display = "flex";
          }
      }
  });

  summarizeBtn.addEventListener("click", async () => {
    if (isGenerating) {
        // STOP Action
        if (abortController) {
            abortController.abort();
            abortController = null;
        }
        setGeneratingState(false); // Reset UI to non-generating state
        return;
    }
    // START Action
    await startSummary();
  });
  
  copyBtn.addEventListener("click", async () => {
    if (!currentMetadata.summary) return;
    
    try {
        const data = await browser.storage.local.get("markdownTemplate");
        const template = data.markdownTemplate || "# [{{title}}]({{url}})\n\n{{summary}}";
        
        let execSummary = currentMetadata.summary || "";
        const headerMatch = execSummary.match(/^###/m);
        if (headerMatch) {
            execSummary = execSummary.substring(0, headerMatch.index).trim();
        }

        const markdown = template
            .replace(/{{title}}/g, currentMetadata.title)
            .replace(/{{url}}/g, currentMetadata.url)
            .replace(/{{summary}}/g, currentMetadata.summary)
            .replace(/{{summary_executive}}/g, execSummary);
    
        await navigator.clipboard.writeText(markdown);
        
        // Show checkmark icon temporarily
        const originalChild = copyBtn.firstElementChild.cloneNode(true); // Save state
        copyBtn.replaceChildren(getIcon(CHECK_ICON_STR));
        
        setTimeout(() => {
            copyBtn.replaceChildren(originalChild); // Restore
        }, 1500);
    } catch (err) {
        console.error("Error copiant:", err);
        errorDiv.textContent = "Error copiant al porta-retalls.";
        errorDiv.classList.remove("hidden");
    }
  });

  const obsidianBtn = document.getElementById("obsidianBtn");

  obsidianBtn.addEventListener("click", async () => {
    if (!currentMetadata.summary) return;

    try {
        const config = await browser.storage.local.get(["obsidianVault", "obsidianPath", "obsidianTemplate"]);
        const vault = config.obsidianVault || "Obsidian";
        const pathTemplate = config.obsidianPath || "[4 Arxiu/Notes/]YYYY/gggg-[W]ww";
        const contentTemplate = config.obsidianTemplate || "- [{{title}}]({{url}})\n\t- {{summary_executive}}";

        if (!vault) {
            // Show error in UI instead of alert if possible, but alert is quick
            const confirmConfig = confirm("Obsidian no està configurat. Vols obrir la configuració?");
            if (confirmConfig) browser.runtime.openOptionsPage();
            return;
        }

        const filePath = parseObsidianPath(pathTemplate);
        const content = formatObsidianContent(contentTemplate, currentMetadata);

        // Construct URI using Native Obsidian URI (supports append=true)
        // https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
        const uri = `obsidian://new?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(filePath)}&content=${encodeURIComponent(content.trim())}&append=true`;

        // Open using a hidden iframe to avoid opening a new tab/window in Firefox
        // This is often more reliable for protocols than link clicks
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = uri;
        document.body.appendChild(iframe);
        setTimeout(() => iframe.remove(), 2000); // Give it enough time to trigger
        
        // Visual feedback
        const originalChild = obsidianBtn.firstElementChild.cloneNode(true);
        obsidianBtn.replaceChildren(getIcon(CHECK_ICON_STR));
        setTimeout(() => obsidianBtn.replaceChildren(originalChild), 1500);

    } catch (e) {
        console.error("Error Obisidian:", e);
        errorDiv.textContent = "Error: " + e.message;
        errorDiv.classList.remove("hidden");
    }
  });

  // ISO Week Date functions
  function getISOWeekDate(d) {
    const date = new Date(d.valueOf());
    const dayNumber = (d.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNumber + 3);
    const firstThursday = date.valueOf();
    date.setUTCMonth(0, 1);
    if (date.getUTCDay() !== 4) {
      date.setUTCMonth(0, 1 + ((4 - date.getUTCDay()) + 7) % 7);
    }
    const weekNumber = 1 + Math.ceil((firstThursday - date) / 604800000);
    const weekYear = date.getUTCFullYear();
    return { week: weekNumber, year: weekYear };
  }

  function formatObsidianPath(template) {
      const now = new Date();
      
      const tokens = {
          'YYYY': now.getFullYear().toString(),
          'MM': (now.getMonth() + 1).toString().padStart(2, '0'),
          'DD': now.getDate().toString().padStart(2, '0'),
          'HH': now.getHours().toString().padStart(2, '0'),
          'mm': now.getMinutes().toString().padStart(2, '0'),
          // ISO Week Year
          'gggg': () => getISOWeekDate(now).year.toString(),
          // ISO Week Number
          'ww': () => getISOWeekDate(now).week.toString().padStart(2, '0')
      };

      // 1. Handle escaped brackets [text] -> protect them
      // We'll replace them with a placeholder, process date tokens, then restore
      const placeholders = [];
      let processed = template.replace(/\[([^\]]+)\]/g, (match, content) => {
          placeholders.push(content);
          return `__ESC_${placeholders.length - 1}__`;
      });

      // 2. Process Date Tokens (Sort by length desc to avoid substring collisions)
      // Actually simple replace for known tokens is fine if we are careful
      // But user might use 'YYYY' or 'gggg'
      
      // Let's use a regex that matches our tokens
      const tokenRegex = /gggg|YYYY|MM|DD|ww|HH|mm/g;
      
      processed = processed.replace(tokenRegex, (match) => {
          const val = tokens[match];
          return typeof val === 'function' ? val() : val;
      });

      // 3. Restore escaped content
      return processed.replace(/__ESC_(\d+)__/g, (match, index) => {
          return placeholders[index];
      });
  }

  // Alias for compatibility if needed, using the new logic
  const parseObsidianPath = formatObsidianPath;

  function formatObsidianContent(template, metadata) {
      // Extract Executive Summary (Text before first Header)
      let execSummary = metadata.summary || "";
      // Regex: Start of string until first markdown header (### or **) or specific marker
      // Since our Prompt enforces no headers for the first paragraph, it should be everything until "### Punts Clau"
      const headerMatch = execSummary.match(/^###/m);
      if (headerMatch) {
          execSummary = execSummary.substring(0, headerMatch.index).trim();
      }
      
      return template
          .replace(/{{title}}/g, metadata.title)
          .replace(/{{url}}/g, metadata.url)
          .replace(/{{summary}}/g, metadata.summary)
          .replace(/{{summary_executive}}/g, execSummary).trim();
  }

  settingsBtn.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });

  function setGeneratingState(generating) {
      isGenerating = generating;
      if (generating) {
          summarizeBtn.replaceChildren(getIcon(PAUSE_ICON_STR));
          summarizeBtn.classList.add("stop-btn");
          summarizeBtn.classList.remove("primary");
          summarizeBtn.title = "Aturar Generació";
          copyBtn.disabled = true;
          loadingDiv.classList.remove("hidden");
      } else {
          summarizeBtn.replaceChildren(getIcon(PLAY_ICON_STR));
          summarizeBtn.classList.remove("stop-btn");
          summarizeBtn.classList.add("primary");
          summarizeBtn.title = "Resumir Pàgina";
          loadingDiv.classList.add("hidden");
          stopGenerationTimer();
          
          // Re-enable copy button if we have content
          const hasContent = !!currentMetadata.summary;
          copyBtn.disabled = !hasContent;
          document.getElementById("obsidianBtn").disabled = !hasContent;
      }
  }

  function resetUI() {
    loadingDiv.classList.add("hidden");
    
    // Reset buttons state
    summarizeBtn.disabled = false;

    
    // Only enable copy if we have a summary
    const hasContent = !!currentMetadata.summary;
    copyBtn.disabled = !hasContent;
    document.getElementById("obsidianBtn").disabled = !hasContent;
    
    // Check visibility preference
    browser.storage.local.get(["enableMarkdown", "enableObsidian"]).then(config => {
        if (config.enableMarkdown === false) copyBtn.style.display = "none";
        else copyBtn.style.display = "flex";
        
        if (config.enableObsidian !== false) document.getElementById("obsidianBtn").style.display = "flex";
        else document.getElementById("obsidianBtn").style.display = "none";
    });
  }

  async function startSummary(overrideText = null) {
    contentDiv.replaceChildren(); // Clear content
    contentDiv.classList.add("hidden");
    errorDiv.textContent = "";
    errorDiv.classList.add("hidden");
    
    setGeneratingState(true);
    
    // loadingDiv removal handled by setGeneratingState

    abortController = new AbortController();
    const signal = abortController.signal;
    
    // Start Timer
    startGenerationTimer();

    try {
      // 1. Get Configuration
      const config = await browser.storage.local.get(["apiKey", "modelName", "systemPrompt", "enableMarkdown", "enableObsidian"]);
      const apiKey = config.apiKey;
      const modelName = config.modelName || "gemma-3-27b-it";
      const systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      
      // Update Button Visibility based on config
      const copyBtn = document.getElementById("copyBtn");
      const obsidianBtn = document.getElementById("obsidianBtn");
      
      if (config.enableMarkdown === false) { // Default is true if undefined
          copyBtn.style.display = "none";
      } else {
          copyBtn.style.display = "flex";
      }

      if (config.enableObsidian !== false) { // Default is true if undefined
          obsidianBtn.style.display = "flex";
      } else {
           obsidianBtn.style.display = "none";
      }

      if (!apiKey) {
        throw new Error("No s'ha configurat la API Key. Ves a la pàgina d'opcions de l'extensió.");
      }

      // Check for abort before heavy operations
      if (signal.aborted) return;

      // 2. Get Page Text (Speculative Loading Check)
      let pageData = null;
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      if (tabs.length === 0) throw new Error("No s'ha trobat cap pestanya activa.");
      const currentUrl = tabs[0].url;

      // 1b. Check Cache (Local Storage)
      // Logic: If we are already showing the cached version for this URL, force refresh (ignore cache)
      const isRefresh = (currentMetadata.url === currentUrl && currentMetadata.fromCache);
      
      if (!isRefresh) {
          try {
              const cacheKey = `summary_cache:${currentUrl}`;
              const cachedData = await browser.storage.local.get(cacheKey);
              const cachedEntry = cachedData[cacheKey];

              if (cachedEntry && cachedEntry.summary) {
                  // Cache hit
                  
                  // Restore Metadata
                  currentMetadata.title = cachedEntry.title || tabs[0].title;
                  currentMetadata.url = currentUrl;
                  currentMetadata.summary = cachedEntry.summary;
                  currentMetadata.fromCache = true;

                  // Render Content
                  contentDiv.replaceChildren(formatTextToFragment(cachedEntry.summary));
                  contentDiv.classList.remove("hidden");
                  
                  // Update UI status
                  setGeneratingState(false);
                  
                  // Update Footer to show "CACHED"
                  const footer = document.getElementById("footer-status");
                  footer.classList.remove("hidden");
                  
                  // Show model used
                  if (cachedEntry.model) {
                      const modelSelect = document.getElementById("model-select");
                      if (modelSelect.value !== cachedEntry.model) {
                          // Try to select if exists, or add temporary option
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

                  // Stop execution here
                  return;
              }
          } catch(e) {
              console.error("Cache check failed:", e);
          }
      }

      // Check if preload is valid for current URL
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
             title: "Selecció: " + tabs[0].title, // Indicate selection
             url: currentUrl,
             text: overrideText
          };
      } else if (!pageData) {
          pageData = await getPageContent();
      }

      // Update metadata
      currentMetadata.title = pageData.title;
      currentMetadata.url = pageData.url;
      currentMetadata.title = pageData.title;
      currentMetadata.url = pageData.url;
      currentMetadata.summary = ""; 
      currentMetadata.fromCache = false; 
      
      let pageText = pageData.text;

      if (signal.aborted) return;
      
      // Token Truncation Logic
      const tokenLimits = {
           "gemma-2-9b-it": 6000,
           "gemma-3-27b-it": 12000,
           "gemini-1.5-flash": 800000,
           "gemini-1.5-pro": 1500000,
           "gemini-2.0-flash": 800000
      };
      
      const safeLimit = tokenLimits[modelName] || 8000;
      const estimatedTokens = Math.ceil(pageText.length / 4);
      
      if (estimatedTokens > safeLimit) {
           const charLimit = safeLimit * 3.5; // Conservative char count
           pageText = pageText.substring(0, charLimit) + "\n\n[... Text truncated due to model limits ...]";
      }

      // 3. Call Gemini API (Streaming)
      let lastUpdate = 0;
      await callGeminiStream(apiKey, modelName, systemPrompt, pageText, signal, (chunkText) => {
          // Update UI with partial text
          currentMetadata.summary += chunkText;
          
          // Throttle updates to avoid DOM thrashing (max 10fps)
          const now = Date.now();
          if (now - lastUpdate > 100) {
            contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary));
            lastUpdate = now;
          }
      });
      
      // Final update to ensure complete text
      contentDiv.replaceChildren(formatTextToFragment(currentMetadata.summary));
      
      setGeneratingState(false);
      contentDiv.classList.remove("hidden");
      
      // Update Stats (Estimation based on final length)
      try {
        const generatedText = currentMetadata.summary;
        const stats = await browser.storage.local.get("stats");
        const currentStats = stats.stats || { articles: 0, tokens: 0 };
        
        const inputTokens = pageText.length / 4;
        const outputTokens = generatedText.length / 4;
        
        const newStats = {
          articles: currentStats.articles + 1,
          tokens: Math.round(currentStats.tokens + inputTokens + outputTokens)
        };

        // SAVE TO CACHE
        try {
            const cacheKey = `summary_cache:${currentMetadata.url}`;
            const cacheEntry = {
                url: currentMetadata.url,
                title: currentMetadata.title,
                summary: currentMetadata.summary,
                model: modelName,
                timestamp: new Date().toISOString(),
                version: "1.0",
                stats: { input: inputTokens, output: outputTokens }
            };
            await browser.storage.local.set({ [cacheKey]: cacheEntry });
        } catch (e) {
            console.error("Error saving to cache:", e);
        }
        
        // Update Stats & History
        updateTokenStats(Math.round(inputTokens), Math.round(outputTokens));
        
        // Add to History Log
        const historyEntry = {
            date: new Date().toISOString(),
            title: currentMetadata.title || "No Title",
            url: currentMetadata.url || "No URL",
            model: modelName,
            inputTokens: Math.round(inputTokens),
            outputTokens: Math.round(outputTokens),
            latency: Date.now() - generationStartTime
        };
        
        const historyData = await browser.storage.local.get("usageHistory");
        const history = historyData.usageHistory || [];
        history.unshift(historyEntry);
        
        // Keep last 100 entries
        if (history.length > 100) history.pop();
        
        await browser.storage.local.set({ stats: newStats, usageHistory: history });
        
      } catch (e) {
        console.error("Error guardant estadístiques:", e);
      }

    } catch (err) {
      if (signal.aborted || err.name === 'AbortError') {
          console.log("Generació avortada per l'usuari.");
          errorDiv.textContent = "Generació aturada per l'usuari.";
          errorDiv.classList.remove("hidden");
      } else {
          stopGenerationTimer();
          errorDiv.textContent = err.message;
          errorDiv.classList.remove("hidden");

          // API Key Error Handling
          if (err.message.includes("API Key") || err.message.includes("not found")) {
            const link = document.createElement("a");
            link.href = "#";
            link.textContent = " Obre la configuració";
            link.style.color = "inherit";
            link.onclick = () => browser.runtime.openOptionsPage();
            errorDiv.appendChild(link);
          }
          
          // Handle Quota/Rate Limit Errors
          if (err.message.includes("429") || err.message.includes("Quota exceeded") || err.message.includes("retry in")) {
             // ... existing quota logic ...
             errorDiv.textContent += " (Quota excedida)"; // Simple feedback
          }
      }
    } finally {
        setGeneratingState(false);
        abortController = null;
    }
  }

  async function callGeminiStream(apiKey, modelName, systemPrompt, text, signal, onChunk) {
    // Use streamGenerateContent with Server-Sent Events (alt=sse)
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
        // Try to parse error
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
        
        // Process SSE lines
        const lines = buffer.split("\n");
        // Keep the last incomplete line in buffer
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

  // Legacy non-streaming function removed/replaced
  function formatText(text) {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Add simple line break handling for streaming
    formatted = formatted.replace(/\n/g, '<br>');
    return formatted;
  }

  async function loadModels(apiKey, currentModel) {
    const modelSelect = document.getElementById("model-select");
    
    try {
        // Add loading state if empty
        if (modelSelect.options.length === 0) {
           const loadingOpt = document.createElement("option");
           loadingOpt.textContent = "Carregant ...";
           modelSelect.appendChild(loadingOpt);
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        if (!response.ok) throw new Error("Failed to fetch models");
        const data = await response.json();
        
        // Filter for content generation and Gemini/Gemma models
        // Filter for content generation and Gemini/Gemma models, excluding specialized/preview ones
        const validModels = data.models
            .filter(m => 
                m.supportedGenerationMethods?.includes("generateContent") &&
                (m.name.includes("gemini") || m.name.includes("gemma")) &&
                !/embedding|aqa|robotics|vision|image|preview|pro-exp/i.test(m.name)
            )
            .map(m => m.name.replace("models/", ""));

        // Prioritize popular/summary models
        const preferred = ["gemma-3-27b-it", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro", "gemma-2-9b-it"];
        
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
            // Clean up name for display
            let displayName = m.replace("gemini-", "").replace("gemma-", "gemma ");
            displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            opt.textContent = displayName;
            modelSelect.appendChild(opt);
        });
        
        // Ensure current model is selected or added
        if (currentModel && !validModels.includes(currentModel)) {
             const opt = document.createElement("option");
             opt.value = currentModel;
             opt.textContent = currentModel;
             modelSelect.appendChild(opt);
        }
        
        if (currentModel) modelSelect.value = currentModel;
        
    } catch (e) {
        console.error("Error loading models:", e);
        // Fallback to basic list if fetch fails
        if (modelSelect.options.length <= 1) {
            modelSelect.replaceChildren();
            const fallbackModels = ["gemma-3-27b-it", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemma-2-9b-it"];
            fallbackModels.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m;
                opt.textContent = m;
                modelSelect.appendChild(opt);
            });
            if (currentModel) modelSelect.value = currentModel;
        }
    }
  }

  function formatTextToFragment(text) {
      if (!text) return document.createDocumentFragment();
      const fragment = document.createDocumentFragment();
      const lines = text.split(/\n/);
      
      lines.forEach((line, i) => {
          if (i > 0) fragment.appendChild(document.createElement('br'));
          
          const parts = line.split(/\*\*(.*?)\*\*/g);
          parts.forEach((part, index) => {
              if (index % 2 === 1) { // Bold
                  const strong = document.createElement('strong');
                  strong.textContent = part;
                  fragment.appendChild(strong);
              } else if (part) {
                  fragment.appendChild(document.createTextNode(part));
              }
          });
      });
      return fragment;
  }

  // --- Token Stats Management ---

  function updateTokenStats(sent, received) {
      const sentEl = document.getElementById("quota-count");
      const receivedEl = document.getElementById("quota-reset");
      
      sentEl.textContent = `Enviats: ${sent}`;
      sentEl.style.color = "";
      receivedEl.textContent = `Rebuts: ${received}`;
      receivedEl.style.color = "";

      const footer = document.getElementById("footer-status");
      footer.classList.remove("hidden");
  }

  // --- Quota Management (Legacy/Secret) ---
  
  function updateResetTime() {
     // Disabled to avoid overwriting Token Stats
  }

  async function checkAndIncrementQuota(modelName, increment = false) {
    const todayPT = new Date().toLocaleDateString("en-CA", {timeZone: "America/Los_Angeles"});
    
    let quotaData = { date: todayPT, count: 0 };
    
    try {
      const stored = await browser.storage.local.get("dailyQuota");
      if (stored.dailyQuota) {
          if (stored.dailyQuota.date === todayPT) {
             quotaData = stored.dailyQuota;
          } else {
             // Reset if new day
             await browser.storage.local.set({ dailyQuota: quotaData });
          }
      }
    } catch(e) {
      console.error("Error reading quota", e);
    }
    
    if (increment) {
      quotaData.count++;
      await browser.storage.local.set({ dailyQuota: quotaData });
    }
  }

  // --- Countdown Logic with Persistence ---
  
  let countdownInterval = null;

  async function startCountdown(seconds) {
    if (countdownInterval) clearInterval(countdownInterval);
    
    const unblockTime = Date.now() + (seconds * 1000);
    await browser.storage.local.set({ blockedUntil: unblockTime });
    
    runCountdownTimer(unblockTime);
  }

  function runCountdownTimer(unblockTime) {
     if (countdownInterval) clearInterval(countdownInterval);
     
     const footer = document.getElementById("footer-status");
     footer.classList.remove("hidden");
     
     const updateTimer = () => {
         const now = Date.now();
         const remainingMs = unblockTime - now;
         const remainingSec = Math.ceil(remainingMs / 1000);
         
         const resetEl = document.getElementById("quota-reset");
         const countEl = document.getElementById("quota-count");

         if (remainingSec <= 0) {
             clearInterval(countdownInterval);
             browser.storage.local.remove("blockedUntil");
             
             countEl.textContent = "Reintenta-ho"; 
             countEl.style.color = "#28a745"; 
             
             // Restore stats display after error clears? 
             // For now just leave "Reintenta-ho" until next generation
         } else {
             countEl.textContent = "Límit assolit";
             countEl.style.color = "#d70022";
             
             resetEl.textContent = `Espera: ${remainingSec}s`;
             resetEl.style.color = "#d70022";
             resetEl.style.fontWeight = "bold";
         }
     };
     
     updateTimer(); // Immediate update
     countdownInterval = setInterval(updateTimer, 1000);
  }

  // --- Content Extraction Logic ---

  async function getPageContent() {
      const tabs = await browser.tabs.query({active: true, currentWindow: true});
      if (tabs.length === 0) throw new Error("No active tab found");
      const tabId = tabs[0].id;
      const tabUrl = tabs[0].url;
      const tabTitle = tabs[0].title;

      let text = "";

      // HACKER NEWS SPECIAL LOGIC
      if (tabUrl.includes("news.ycombinator.com/item")) {
          // ... (existing HN logic) ...
          try {
              const scriptResults = await browser.scripting.executeScript({
                 target: {tabId: tabId},
                 func: () => {
                     const titleEl = document.querySelector(".titleline a");
                     const title = titleEl ? titleEl.innerText : document.title;
                     const comments = Array.from(document.querySelectorAll(".commtext"));
                     const topComments = comments.slice(0, 15).map(c => "- " + c.innerText.replace(/\s+/g, " ").trim()).join("\n");
                     return `Title: ${title}\n\nTop Discussion Comments:\n${topComments}`;
                 }
              });
              if (scriptResults?.[0]?.result) text = scriptResults[0].result;
          } catch (e) {
              console.warn("HN extraction failed", e);
          }
      } 
      
      // YOUTUBE SPECIAL LOGIC
      else if (tabUrl.includes("youtube.com/watch")) {
          try {
              let transcriptText = "";
              
              // 1. Try to get Transcript via Internal API (MAIN world injection)
              const playerResponse = await browser.scripting.executeScript({
                  target: {tabId: tabId},
                  world: "MAIN", 
                  func: () => {
                      try {
                          // Try multiple sources for player response
                          const player = document.getElementById('movie_player');
                          let response = player && player.getPlayerResponse ? player.getPlayerResponse() : null;
                          if (!response) response = window.ytInitialPlayerResponse;
                          
                          if (!response || !response.captions) return null;
                          
                          const tracks = response.captions.playerCaptionsTracklistRenderer?.captionTracks;
                          if (!tracks || tracks.length === 0) return null;
                          
                          // Priority: Catalan > English > Spanish > Auto-generated > First available
                          const getScore = (t) => {
                              if (t.languageCode === 'ca') return 100;
                              if (t.languageCode === 'en') return 50;
                              if (t.languageCode === 'es') return 40;
                              if (t.kind === 'asr') return 0; // Auto-generated
                              return 10;
                          };
                          
                          tracks.sort((a, b) => getScore(b) - getScore(a));
                          const track = tracks[0];
                                     
                          return { baseUrl: track.baseUrl, language: track.name?.simpleText, isAsr: track.kind === 'asr' };
                      } catch (e) {
                          return null;
                      }
                  }
              });

              const trackData = playerResponse?.[0]?.result;

              if (trackData && trackData.baseUrl) {
                   console.log(`Found transcript (${trackData.language}):`, trackData.baseUrl);
                   
                   try {
                       const transcriptResponse = await fetch(trackData.baseUrl, { credentials: 'include' });
                       if (!transcriptResponse.ok) throw new Error("Fetch failed");
                       const transcriptXml = await transcriptResponse.text();
                       
                       if (transcriptXml) {
                           const parser = new DOMParser();
                           const xmlDoc = parser.parseFromString(transcriptXml, "text/xml");
                           const texts = xmlDoc.getElementsByTagName("text");
                           
                           let fullText = "";
                           for (let i = 0; i < texts.length; i++) {
                               let line = texts[i].textContent;
                               // Basic cleanup of HTML entities checks
                               line = line.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
                               fullText += line + " ";
                           }
                           
                           fullText = fullText.replace(/\s+/g, " ").trim();
                           if (fullText.length > 50) {
                               transcriptText = `[TRANSCRIPT: ${trackData.language}${trackData.isAsr ? ' (Auto)' : ''}]\n\n${fullText}`;
                           }
                       }
                   } catch (err) {
                       console.error("Error fetching/parsing XML transcript:", err);
                   }
              }
              
              // 2. UI Fallback (if API failed)
              if (!transcriptText) {
                   const transcriptResult = await browser.scripting.executeScript({
                       target: {tabId: tabId},
                       func: () => {
                           const segments = document.querySelectorAll('ytd-transcript-segment-renderer .segment-text');
                           if (segments && segments.length > 0) {
                               return Array.from(segments).map(s => s.innerText).join(" ");
                           }
                           return null;
                       }
                   });
                   if (transcriptResult?.[0]?.result) {
                       transcriptText = "[TRANSCRIPT (FROM PANEL)]\n\n" + transcriptResult[0].result;
                   }
              }

              // 3. Description Fallback (Critical if no transcript found)
              // Better to summarize description than send empty text
              if (!transcriptText) {
                  const descResult = await browser.scripting.executeScript({
                      target: {tabId: tabId},
                      func: () => {
                          const title = document.title;
                          // Expand description if possible
                          const moreBtn = document.querySelector('#expand');
                          if(moreBtn) moreBtn.click();
                          
                          const descEl = document.querySelector('#description-inline-expander') || document.querySelector('#description');
                          const desc = descEl ? descEl.innerText : "";
                          return `Title: ${title}\n\nDescription:\n${desc}`;
                      }
                  });
                  if (descResult?.[0]?.result && descResult[0].result.length > 50) {
                      transcriptText = descResult[0].result + "\n\n[Nota: No s'ha trobat transcripció disponible per a aquest vídeo. Es resumeix la descripció.]";
                  }
              }

              if (transcriptText) {
                  text = transcriptText;
              }

          } catch (e) {
              console.warn("YouTube extraction totally failed", e);
          }
      }
      
      // FALLBACK / STANDARD LOGIC
      if (!text) {
          try {
            await browser.scripting.executeScript({
                target: {tabId: tabId},
                files: ["Readability.js"]
            });
          } catch (e) {}

          const scriptResults = await browser.scripting.executeScript({
            target: {tabId: tabId},
            func: () => {
                if (typeof Readability !== 'undefined') {
                    try {
                        const article = new Readability(document.cloneNode(true)).parse();
                        if (article && article.textContent) return article.textContent;
                    } catch(e) {}
                }
                return document.body.innerText;
            }
          }).catch(async (err) => {
            if (err.message.includes("Missing host permission")) {
               // We don't request permission during preload/speculative, only explicit
               // But if this is called from startSummary, we might want to.
               // For simplicity in this refactor, we let it fail if permission missing, 
               // and startSummary logic will handle "retry fresh" but logic inside here needs to support it?
               // Actually, if getPageContent fails, startSummary catches it.
               throw err;
            }
            throw err;
          });
          
          if (scriptResults?.[0]?.result) text = scriptResults[0].result;
      }

      if (!text || text.trim() === "") throw new Error("Page content empty");
      
      return { title: tabTitle, url: tabUrl, text: text };
  }

  // --- Generation Timer ---
  
  let generationInterval = null;
  let generationStartTime = 0;

  function startGenerationTimer() {
      if (generationInterval) clearInterval(generationInterval);
      
      const timerEl = document.getElementById("generation-timer");
      timerEl.textContent = "0.0s";
      timerEl.style.color = "#666";
      
      generationStartTime = Date.now();
      
      generationInterval = setInterval(() => {
          const elapsed = (Date.now() - generationStartTime) / 1000;
          timerEl.textContent = elapsed.toFixed(1) + "s";
      }, 100);
  }

  function stopGenerationTimer() {
      if (generationInterval) clearInterval(generationInterval);
      generationInterval = null;
      
      const timerEl = document.getElementById("generation-timer");
      timerEl.style.color = "#28a745"; 
  }

  // --- Initial Load Logic ---
  
  (async () => {
      try {
          const data = await browser.storage.local.get(["apiKey", "modelName", "blockedUntil"]);
          const modelName = data.modelName || "gemma-3-27b-it";
          
          // Init UI with zero stats
          updateTokenStats(0, 0);
          
          // Speculative Loading
          contentPreload = getPageContent().catch(e => console.log("Speculative load failed:", e));

          // Check if blocked
          if (data.blockedUntil && Date.now() < data.blockedUntil) {
              runCountdownTimer(data.blockedUntil);
          } else {
              if (data.blockedUntil) await browser.storage.local.remove("blockedUntil");
          }

          // Load Models
          if (data.apiKey) {
              await loadModels(data.apiKey, modelName);
          } else {
              const modelSelect = document.getElementById("model-select");
              const opt = document.createElement("option");
              opt.textContent = "Configura l'API Key";
              modelSelect.replaceChildren(opt);
          }

      } catch (e) {
          console.error("Error initializing sidebar:", e);
      }
  })();

  // --- Model Selector Logic ---
  const modelSelect = document.getElementById("model-select");
  
  modelSelect.addEventListener("change", async (e) => {
      const newModel = e.target.value;
      await browser.storage.local.set({ modelName: newModel });
  });

  // --- Context Menu / Message Handling ---
  
  async function handleTrigger(data) {
      if (data.type === 'selection' && data.content) {
          // Add a small delay to ensure UI is ready if just opened
          setTimeout(() => startSummary(data.content), 100);
      } else if (data.type === 'page') {
          setTimeout(() => startSummary(), 100);
      }
  }

  browser.runtime.onMessage.addListener((message) => {
      if (message.action === "trigger_summary") {
          handleTrigger(message.data);
      }
  });

  // Check for pending actions on load
  browser.storage.local.get("pendingSummary").then(data => {
      if (data.pendingSummary) {
          console.log("Found pending summary action:", data.pendingSummary);
          handleTrigger(data.pendingSummary);
          browser.storage.local.remove("pendingSummary");
      }
  });

});
