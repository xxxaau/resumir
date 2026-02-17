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
  let currentSourceText = ""; // Store original text for deep dive context
  let contentPreload = null; // Promise for speculative loading

  // Models will be loaded dynamically via API

  // Initial Visibility Check
  // MIGRATION LOGIC: Check if sync has config, if not and local has it, migrate.
  browser.storage.sync.get(["apiKey"]).then(async (syncConfig) => {
      if (!syncConfig.apiKey) {
          const localConfig = await browser.storage.local.get(["apiKey", "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "obsidianVault", "obsidianPath", "obsidianTemplate", "markdownTemplate"]);
          if (localConfig.apiKey) {
              console.log("Migrating settings from Local to Sync...");
              await browser.storage.sync.set(localConfig);
              // Optional: Clear local settings? modifying local is risky if things go wrong. Let's keep duplicate for now or specific keys.
          }
      }
  });

  browser.storage.sync.get(["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableDeepDive"]).then(config => {
      const isDeepDiveEnabled = config.enableDeepdive === true || config.enableDeepDive === true;
      const copyBtn = document.getElementById("copyBtn");
      const obsidianBtn = document.getElementById("obsidianBtn");
      
      if (config.enableMarkdown) copyBtn.style.display = "flex";
      else copyBtn.style.display = "none";
      
      if (config.enableObsidian) obsidianBtn.style.display = "flex";
      else obsidianBtn.style.display = "none";

      if (config.enableBionic) document.getElementById("bionicBtn").style.display = "flex";
      else document.getElementById("bionicBtn").style.display = "none";

      if (isDeepDiveEnabled) document.getElementById("deepDiveBtn").style.display = "flex";
      else document.getElementById("deepDiveBtn").style.display = "none";
      
      resetUI(); // Initialize button states (disabled if no content)
  });

  // Listen for configuration changes
  browser.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
          if (changes.apiKey) {
              window.location.reload();
          }
          if (changes.enableMarkdown) {
              const copyBtn = document.getElementById("copyBtn");
              if (changes.enableMarkdown.newValue === true) copyBtn.style.display = "flex";
              else copyBtn.style.display = "none";
          }
          if (changes.enableObsidian) {
              const obsidianBtn = document.getElementById("obsidianBtn");
              if (changes.enableObsidian.newValue === true) obsidianBtn.style.display = "flex";
              else obsidianBtn.style.display = "none";
          }
          if (changes.enableBionic) {
              const bionicBtn = document.getElementById("bionicBtn");
              if (changes.enableBionic.newValue === true) bionicBtn.style.display = "flex";
              else bionicBtn.style.display = "none";
          }
          if (changes.enableDeepdive || changes.enableDeepDive) {
              const deepDiveBtn = document.getElementById("deepDiveBtn");
              const newVal = (changes.enableDeepdive?.newValue === true) || (changes.enableDeepDive?.newValue === true);
              if (newVal) deepDiveBtn.style.display = "flex";
              else deepDiveBtn.style.display = "none";
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
    await startSummary(null, false, true);
  });
  
  copyBtn.addEventListener("click", async () => {
    if (!currentMetadata.summary) return;
    
    try {
        const data = await browser.storage.sync.get("markdownTemplate");
        const template = data.markdownTemplate || "# [{{title}}]({{url}})\n\n{{summary}}";
        
        const markdown = formatMarkdownContent(template, currentMetadata);
    
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
        const config = await browser.storage.sync.get(["obsidianVault", "obsidianPath", "obsidianTemplate"]);
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

        // Use browser.tabs.update to trigger the protocol handler from the active tab.
        // This is the standard way for WebExtensions to open external protocols without CSP issues.
        try {
            const tabs = await browser.tabs.query({active: true, currentWindow: true});
            if (tabs.length > 0) {
                await browser.tabs.update(tabs[0].id, {url: uri});
            } else {
                // No active tab? Create a new one and close it (fallback)
                const tab = await browser.tabs.create({ url: uri, active: false });
                setTimeout(() => browser.tabs.remove(tab.id), 5000);
            }
        } catch (err) {
            console.error("Obsidian protocol failed:", err);
            errorDiv.textContent = "Error obrint Obsidian: " + err.message;
            errorDiv.classList.remove("hidden");
        }
        
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



  const deepDiveBtn = document.getElementById("deepDiveBtn");
  deepDiveBtn.addEventListener("click", async () => {
      // Logic for Deep Dive
      // Should we re-use the current page content? Yes.
      // We don't need to re-extract if we can just re-trigger summary with new prompt.
      // But startSummary extracts content again, which is fine and safer (in case page changed).
      
      // Visual feedback?
      await startSummary(null, true);
  });

  settingsBtn.addEventListener("click", () => {
    browser.runtime.openOptionsPage();
  });

  // ... (setGeneratingState, resetUI are fine) ...

  function setGeneratingState(generating) {
      isGenerating = generating;
      if (generating) {
          summarizeBtn.replaceChildren(getIcon(PAUSE_ICON_STR));
          summarizeBtn.classList.add("stop-btn");
          summarizeBtn.classList.remove("primary");
          summarizeBtn.title = "Aturar Generació";
          copyBtn.disabled = true;
          document.getElementById("obsidianBtn").disabled = true;
          document.getElementById("bionicBtn").disabled = true;
          document.getElementById("deepDiveBtn").disabled = true;
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
          document.getElementById("bionicBtn").disabled = !hasContent;
          document.getElementById("deepDiveBtn").disabled = !hasContent;
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
    document.getElementById("bionicBtn").disabled = !hasContent;
    document.getElementById("deepDiveBtn").disabled = !hasContent;
    
    // Check visibility preference
    browser.storage.sync.get(["enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "enableDeepDive"]).then(config => {
        const isDeepDiveEnabled = config.enableDeepdive === true || config.enableDeepDive === true;
        if (config.enableMarkdown) copyBtn.style.display = "flex";
        else copyBtn.style.display = "none";
        
        if (config.enableObsidian) document.getElementById("obsidianBtn").style.display = "flex";
        else document.getElementById("obsidianBtn").style.display = "none";

        if (config.enableBionic) document.getElementById("bionicBtn").style.display = "flex";
        else document.getElementById("bionicBtn").style.display = "none";

        if (isDeepDiveEnabled) document.getElementById("deepDiveBtn").style.display = "flex";
        else document.getElementById("deepDiveBtn").style.display = "none";
    });
  }

  async function startSummary(overrideText = null, isDeepDive = false, isUserInitiated = false) {
    // Only proceed if triggered by user action, context menu, or deep dive
    // This prevents auto-refreshing when switching tabs back to a cached URL
    if (!overrideText && !isDeepDive && !isUserInitiated) {
        return; 
    }

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
      // 1. Get Configuration (FROM SYNC)
      const config = await browser.storage.sync.get(["apiKey", "modelName", "systemPrompt", "enableMarkdown", "enableObsidian", "enableBionic", "enableDeepdive", "deepDivePrompt"]);
      const apiKey = config.apiKey;
      const modelName = config.modelName || "gemma-3-27b-it";
      
      let systemPrompt = config.systemPrompt || DEFAULT_SYSTEM_PROMPT;
      if (isDeepDive) {
          systemPrompt = config.deepDivePrompt || "Actua com un expert analista..."; // Fallback if empty but enabled
      }

      // Update Button Visibility based on config
      const copyBtn = document.getElementById("copyBtn");
      const obsidianBtn = document.getElementById("obsidianBtn");
      
      // ... visibility logic repeated? It's already handled by visibility check, but startSummary re-checks? 
      // Actually startSummary function in the file has this visibility logic inside it.
      // We should keep it or refactor. The replacement content should match the target content context.
      
      if (config.enableMarkdown) { 
          copyBtn.style.display = "flex";
      } else {
          copyBtn.style.display = "none";
      }
      // ... continue with existing logic ...

      if (config.enableObsidian) { 
          obsidianBtn.style.display = "flex";
      } else {
           obsidianBtn.style.display = "none";
      }

      if (config.enableBionic) {
        document.getElementById("bionicBtn").style.display = "flex";
      } else {
        document.getElementById("bionicBtn").style.display = "none";
      }

      if (config.enableDeepdive) {
        document.getElementById("deepDiveBtn").style.display = "flex";
      } else {
        document.getElementById("deepDiveBtn").style.display = "none";
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

      // 1b. Check for Active Session check moved to init()
      // We rely on init() to restore session on load.
      // Here we only check cache if we are explicitly running a new summary flow (which shouldn't happen automatically now).

      // Check Cache (Local Storage) ONLY if no active session (should not happen often now)
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

                  // Background fetch context for potential Deep Dive
                  // Since we are on the page (URL match confirmed above), this is safe
                  getPageContent().then(data => {
                      if (data && data.text) currentSourceText = data.text;
                  }).catch(e => console.log("Background context fetch failed:", e));
                  
                  // Don't save session here implicitly, explicit action needed usually.
                  // But if we load cache, maybe we should set session being active?
                  // Yes, let's set session so swapping tabs keeps this cache visible.
                  browser.storage.local.set({ 
                      currentSession: {
                          ...currentMetadata,
                          sourceText: currentSourceText, // Might be empty until fetch completes
                          timestamp: cachedEntry.timestamp
                      }
                  });

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
      } else if (isDeepDive && currentSourceText) {
          // Use stored text context for Deep Dive if available
          pageData = {
              title: currentMetadata.title,
              url: currentMetadata.url,
              text: currentSourceText
          };
      } else if (!pageData) {
          pageData = await getPageContent();
      }

      // Update metadata
      currentMetadata.title = pageData.title;
      currentMetadata.url = pageData.url;
      // Note: Do not clear summary/metadata yet for deep dive? 
      // Actually Deep Dive replaces content, so yes clear summary.
      currentMetadata.summary = ""; 
      currentMetadata.fromCache = false; 
      
      let pageText = pageData.text;
      currentSourceText = pageText; // Update context for next Deep Dive

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
      const estimatedTokens = estimateTokens(pageText);
      
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
             // Already showing prominent message usually, but if they clicked anyway:
             const btn = document.createElement("button");
             btn.textContent = "Configurar";
             btn.className = "primary";
             btn.style.marginTop = "10px";
             btn.onclick = () => browser.runtime.openOptionsPage();
             errorDiv.appendChild(document.createElement("br"));
             errorDiv.appendChild(btn);
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
          
          // Persist current session state to survive sidebar reloads
          if (currentMetadata.summary) {
              browser.storage.local.set({ 
                  currentSession: {
                      ...currentMetadata,
                      sourceText: currentSourceText,
                      timestamp: Date.now()
                  }
              });
          }
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
        const preferred = ["gemini-1.5-flash-latest", "gemini-2.0-flash-lite-preview-02-05", "gemini-2.0-flash", "gemma-3-27b-it", "gemini-1.5-flash", "gemini-1.5-pro"];
        
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
            
            // Friendly names for specific models
            if (m === "gemini-1.5-flash-latest") displayName = "Gemini 1.5 Flash (Latest)";
            else if (m.includes("flash-lite")) displayName = "Gemini 2.0 Flash Lite";
            else if (m === "gemma-3-27b-it") displayName = "Gemma 3 27B";
            else displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            
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
            const fallbackModels = ["gemini-1.5-flash-latest", "gemini-2.0-flash-lite-preview-02-05", "gemini-2.0-flash", "gemma-3-27b-it"];
            fallbackModels.forEach(m => {
                const opt = document.createElement("option");
                opt.value = m;
                let name = m;
                if (m === "gemini-1.5-flash-latest") name = "Gemini 1.5 Flash (Latest)";
                else if (m.includes("flash-lite")) name = "Gemini 2.0 Flash Lite";
                
                opt.textContent = name;
                modelSelect.appendChild(opt);
            });
            if (currentModel) modelSelect.value = currentModel;
        }
    }
  }

  let isBionicEnabled = false;

  // Initialize visibility from config is already done above.
  
  const bionicBtn = document.getElementById("bionicBtn");
  bionicBtn.addEventListener("click", async () => {
    isBionicEnabled = !isBionicEnabled;
    const contentDiv = document.getElementById("content");
    
    if (isBionicEnabled) {
        bionicBtn.style.color = "var(--primary-color)";
        bionicBtn.style.backgroundColor = "rgba(0,0,0,0.05)";
        
        // Load custom styles
        const settings = await browser.storage.sync.get(["bionicFont", "bionicLineHeight", "bionicFixation"]);
        contentDiv.style.fontFamily = settings.bionicFont || "inherit";
        contentDiv.style.lineHeight = settings.bionicLineHeight || "1.5";
        const fixation = (settings.bionicFixation || 45) / 100;
        
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

  function formatBionicText(text, fixation = 0.45) {
      const fragment = document.createDocumentFragment();
      const parts = text.split(/(\s+)/); 
      parts.forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
             fragment.appendChild(document.createTextNode(part));
             return;
        }
 
        const len = part.length;
        if (len === 0) return;
 
        let boldLen = 1;
        if (len > 3) {
            boldLen = Math.ceil(len * fixation);
        }
        
        const boldStr = part.slice(0, boldLen);
        const restStr = part.slice(boldLen);
        
        const b = document.createElement("b");
        b.textContent = boldStr;
        fragment.appendChild(b);
        fragment.appendChild(document.createTextNode(restStr));
      });
      return fragment;
  }

  function formatTextToFragment(text, bionic = false, fixation = 0.45) {
      if (!text) return document.createDocumentFragment();
      const fragment = document.createDocumentFragment();
      const lines = text.split(/\n/);
      
      let currentList = null;
 
      const formatInline = (textStr) => {
        const span = document.createElement('span');
        const parts = textStr.split(/\*\*(.*?)\*\*/g);
        parts.forEach((part, index) => {
            if (index % 2 === 1) { // Bold (Already Markdown Bold)
                const strong = document.createElement('strong');
                strong.textContent = part;
                span.appendChild(strong);
            } else if (part) {
                if (bionic) {
                    span.appendChild(formatBionicText(part, fixation));
                } else {
                    span.appendChild(document.createTextNode(part));
                }
            }
        });
        return span;
      };

      for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const trimmed = line.trim();

          if (trimmed === "") {
              if (currentList) {
                  fragment.appendChild(currentList);
                  currentList = null;
              }
              const p = document.createElement('p'); // Empty line as p min-height?
              // Just spacing
              continue;
          }

          // Headers
          const headerMatch = line.match(/^(#{1,3})\s+(.*)/);
          if (headerMatch) {
              if (currentList) {
                  fragment.appendChild(currentList);
                  currentList = null;
              }
              const level = headerMatch[1].length;
              const content = headerMatch[2];
              const h = document.createElement(`h${level}`);
              h.appendChild(formatInline(content));
              fragment.appendChild(h);
              continue;
          }

          // List Items
          const listMatch = line.match(/^(\*|-)\s+(.*)/);
          if (listMatch) {
              if (!currentList) {
                  currentList = document.createElement('ul');
              }
              const li = document.createElement('li');
              li.appendChild(formatInline(listMatch[2]));
              currentList.appendChild(li);
              continue;
          }

          // Regular Paragraph
          if (currentList) {
              fragment.appendChild(currentList);
              currentList = null;
          }
          
          const p = document.createElement('p');
          p.appendChild(formatInline(line));
          fragment.appendChild(p);
      }
      
      if (currentList) {
          fragment.appendChild(currentList);
      }

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

  async function executeScriptSafe(injection) {
      try {
          return await browser.scripting.executeScript(injection);
      } catch (err) {
          if (err.message.includes("Missing host permission") || err.message.includes("Missing permissions")) {
              try {
                  const tabId = injection.target.tabId;
                  const tab = await browser.tabs.get(tabId);
                  const granted = await browser.permissions.request({
                      origins: [tab.url]
                  });
                  if (granted) {
                      return await browser.scripting.executeScript(injection);
                  }
              } catch (permErr) {
                  console.warn("Permission request failed (likely no user gesture):", permErr);
              }
          }
          throw err;
      }
  }

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
              const scriptResults = await executeScriptSafe({
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
              const playerResponse = await executeScriptSafe({
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
                   const transcriptResult = await executeScriptSafe({
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
                  const descResult = await executeScriptSafe({
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
            await executeScriptSafe({
                target: {tabId: tabId},
                files: ["Readability.js"]
            });
          } catch (e) {}

          const scriptResults = await executeScriptSafe({
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
          // Get config from SYNC (apiKey, modelName) and local state (blockedUntil)
          const syncData = await browser.storage.sync.get(["apiKey", "modelName"]);
          const localData = await browser.storage.local.get(["blockedUntil"]);
          
          const apiKey = syncData.apiKey;
          const modelName = syncData.modelName || "gemini-1.5-flash-latest";
          
          // Init UI with zero stats
          updateTokenStats(0, 0);
          
          // Speculative Loading
          contentPreload = getPageContent().catch(e => console.log("Speculative load failed:", e));

          // Check if blocked
          if (localData.blockedUntil && Date.now() < localData.blockedUntil) {
              runCountdownTimer(localData.blockedUntil);
          } else {
              if (localData.blockedUntil) await browser.storage.local.remove("blockedUntil");
          }

          // Load Models
          if (apiKey) {
              await loadModels(apiKey, modelName);

              // --- SESSION RESTORATION LOGIC ---
              // Restore active session if exists to persist state across tab switches/sidebar reloads
              try {
                  const sessionData = await browser.storage.local.get("currentSession");
                  if (sessionData.currentSession) {
                      const session = sessionData.currentSession;
                      console.log("Init: Restoring active session for:", session.url);
                      
                      const contentDiv = document.getElementById("content");
                      
                      // Restore Metadata
                      currentMetadata.title = session.title;
                      currentMetadata.url = session.url;
                      currentMetadata.summary = session.summary;
                      currentMetadata.fromCache = session.fromCache;
                      currentSourceText = session.sourceText || "";
            
                      // Render Content
                      contentDiv.replaceChildren(formatTextToFragment(session.summary));
                      contentDiv.classList.remove("hidden");
                      
                      // Update UI stats
                      const footer = document.getElementById("footer-status");
                      footer.classList.remove("hidden");
                      
                      const quotaCount = document.getElementById("quota-count");
                      if (session.fromCache) {
                         quotaCount.textContent = "MEMÒRIA CAU";
                         quotaCount.style.color = "#28a745"; 
                      } else {
                         quotaCount.textContent = "SESSIÓ ACTIVA";
                         quotaCount.style.color = "#17a2b8"; 
                      }
                      
                      const resetEl = document.getElementById("quota-reset");
                      if (session.timestamp) {
                          const dateStr = new Date(session.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                          resetEl.textContent = `Generat: ${dateStr}`;
                      }
                      resetEl.style.color = "#666";

                      // Validation: If session URL matches current tab, we are good.
                      // If not, we still show session (desired behavior).
                      // But we might want to update the "Preload" context just in case user clicks "Summarize"
                      // Preload is already handled above.
                  }
              } catch (e) {
                  console.error("Session restore failed:", e);
              }

          } else {
              // Missing API Key UX
              const modelSelect = document.getElementById("model-select");
              const opt = document.createElement("option");
              opt.textContent = "Falta API Key";
              modelSelect.replaceChildren(opt);
              modelSelect.disabled = true;
              
              // Style: Red text and border
              modelSelect.style.color = "#d70022";
              modelSelect.style.borderColor = "#d70022";
              modelSelect.style.backgroundColor = "#fff0f0"; // Light red background
              modelSelect.style.fontWeight = "bold";

              // Show prominent message in Sidebar
              const contentDiv = document.getElementById("content");
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
                  browser.runtime.openOptionsPage();
              });

              document.getElementById("getApiKeyLink").addEventListener("click", (e) => {
                  e.preventDefault();
                  // Open in new tab using browser API
                  browser.tabs.create({ url: "https://aistudio.google.com/app/apikey" });
              });
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
          // Passes overrideText=data.content, isDeepDive=false, isUserInitiated=true
          setTimeout(() => startSummary(data.content, false, true), 100);
      } else if (data.type === 'page') {
          // Passes overrideText=null, isDeepDive=false, isUserInitiated=true
          setTimeout(() => startSummary(null, false, true), 100);
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
