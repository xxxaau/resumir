const DEFAULT_MARKDOWN_TEMPLATE = `- [{{title}}]({{url}})\n\t- {{summary_executive}}`;

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

const DEFAULT_OBSIDIAN_TEMPLATE = `- [{{title}}]({{url}})\n\t- {{summary_executive}}`;

// --- Navigation Logic ---
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    // Remove active class from all
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));

    // Add to current
    item.classList.add('active');
    const tabId = item.getAttribute('data-tab');
    document.getElementById(`tab-${tabId}`).classList.add('active');
  });
});

// --- Options Management ---

// --- Options Management ---

function saveOptions(e) {
  e.preventDefault();
  
  // Save all settings including Main, Custom and Extensions
  const settings = {
    apiKey: document.querySelector("#apiKey").value,
    modelName: document.querySelector("#modelName").value,
    theme: document.querySelector("#themeSelect").value,
    systemPrompt: document.querySelector("#systemPrompt").value,
    
    // Extensions
    enableMarkdown: document.querySelector("#enableMarkdown").checked,
    markdownTemplate: document.querySelector("#markdownTemplate").value,
    
    enableObsidian: document.querySelector("#enableObsidian").checked,
    obsidianVault: document.querySelector("#obsidianVault").value,
    obsidianPath: document.querySelector("#obsidianPath").value,
    obsidianTemplate: document.querySelector("#obsidianTemplate").value
  };

  browser.storage.local.set(settings).then(() => {
     showStatus("Configuració guardada correctament!");
  });
}

function restoreOptions() {
  // 1. Restore Fields
  browser.storage.local.get([
      "apiKey", "modelName", "theme", "systemPrompt", "stats", 
      "enableMarkdown", "markdownTemplate",
      "enableObsidian", "obsidianVault", "obsidianPath", "obsidianTemplate"
  ]).then(result => {
    document.querySelector("#apiKey").value = result.apiKey || "";
    document.querySelector("#modelName").value = result.modelName || "gemma-3-27b-it";
    document.querySelector("#themeSelect").value = result.theme || "system";
    document.querySelector("#systemPrompt").value = result.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    // Markdown Extension
    const enableMarkdown = result.enableMarkdown !== false; // Default true
    document.querySelector("#enableMarkdown").checked = enableMarkdown;
    document.querySelector("#markdownTemplate").value = result.markdownTemplate || DEFAULT_MARKDOWN_TEMPLATE;
    toggleConfigVisibility("config-markdown", enableMarkdown);

    // Obsidian Extension
    const enableObsidian = result.enableObsidian !== false; // Default true (was false)
    document.querySelector("#enableObsidian").checked = enableObsidian;
    document.querySelector("#obsidianVault").value = result.obsidianVault || "Obsidian";
    document.querySelector("#obsidianPath").value = result.obsidianPath || "[4 Arxiu/Notes/]YYYY/gggg-[W]ww";
    document.querySelector("#obsidianTemplate").value = result.obsidianTemplate || DEFAULT_OBSIDIAN_TEMPLATE;
    toggleConfigVisibility("config-obsidian", enableObsidian);

    // 2. Restore Stats
    const stats = result.stats || { articles: 0, tokens: 0 };
    document.querySelector("#statsArticles").textContent = stats.articles;
    document.querySelector("#statsTokens").textContent = stats.tokens.toLocaleString();
    
    // Cost estimation
    const costUSD = (stats.tokens / 1000000) * 0.10;
    const costEUR = costUSD * 0.92;
    document.querySelector("#statsCost").textContent = costEUR.toLocaleString('ca-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 6 });
  });

  // 3. Restore Version
  const manifest = browser.runtime.getManifest();
  document.getElementById("appVersion").textContent = manifest.version;
  
  // 4. Load Stats
  loadStatistics();

  
  // 5. Load Cache Info
  updateCacheInfo();
}

function toggleConfigVisibility(id, enabled) {
    const el = document.getElementById(id);
    if (enabled) {
        el.style.display = "block";
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
    } else {
        el.style.opacity = "0.5";
        el.style.pointerEvents = "none";
        // Optionally hide completely: el.style.display = "none";
        // But users prefer to see what they are enabling.
        // Let's use disabled look
    }
}

// Add listeners for toggles
document.querySelector("#enableMarkdown").addEventListener("change", (e) => {
    toggleConfigVisibility("config-markdown", e.target.checked);
});
document.querySelector("#enableObsidian").addEventListener("change", (e) => {
    toggleConfigVisibility("config-obsidian", e.target.checked);
});

function resetTemplate() {
    document.querySelector("#markdownTemplate").value = DEFAULT_MARKDOWN_TEMPLATE;
}

function resetObsidianTemplate() {
    document.querySelector("#obsidianTemplate").value = DEFAULT_OBSIDIAN_TEMPLATE;
}

function showStatus(text) {
  const status = document.querySelector("#status");
  status.textContent = text;
  status.style.display = "block";
  setTimeout(() => {
    status.style.display = "none";
  }, 2000);
}

// --- Model Fetching Logic ---
async function listModels(e) {
  e.preventDefault();
  const apiKey = document.querySelector("#apiKey").value;
  const modelsList = document.querySelector("#modelsList");
  const checkBtn = document.querySelector("#checkModels");
  
  if (!apiKey) {
    alert("Primer introdueix la API Key per buscar els models.");
    return;
  }
  
  checkBtn.textContent = "Cercant...";
  modelsList.style.display = "block";
  modelsList.textContent = "Carregant...";

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || response.statusText);
    }
    const data = await response.json();
    
    // Filter for models that support generateContent
    const validModels = data.models?.filter(m => 
        m.supportedGenerationMethods?.includes("generateContent") &&
        !/embedding|aqa|robotics|vision|image|preview|pro/i.test(m.name)
    ).map(m => m.name.replace("models/", "")) || [];

    if (validModels.length === 0) {
        modelsList.textContent = "No s'han trobat models compatibles.";
    } else {
        modelsList.replaceChildren(); // clear
        validModels.forEach(model => {
            const div = document.createElement("div");
            div.textContent = model;
            div.onclick = () => {
                document.querySelector("#modelName").value = model;
                modelsList.style.display = "none";
            };
            modelsList.appendChild(div);
        });
    }
  } catch (err) {
    modelsList.replaceChildren();
    const span = document.createElement("span");
    span.style.color = "red";
    span.textContent = `Error: ${err.message}`;
    modelsList.appendChild(span);
  } finally {
    checkBtn.textContent = "Cercar models";
  }
}

// --- Statistics Logic ---

async function loadStatistics() {
    try {
        const data = await browser.storage.local.get(["stats", "usageHistory"]);
        const stats = data.stats || { articles: 0, tokens: 0 };
        const history = data.usageHistory || []; // Array of {date, title, url, model, inputTokens, outputTokens, latency}

        // 1. Update KPI Cards
        document.getElementById("kpiRequests").textContent = stats.articles;
        document.getElementById("kpiTokens").textContent = stats.tokens.toLocaleString();
        
        // Calculate Avg Speed (Tokens / Second)
        // We can use history for a more accurate recent speed, or just global if we tracked time globally (we didn't).
        // Let's use the average of the last 100 requests in history for the "Current Speed" KPI.
        let avgSpeed = 0;
        if (history.length > 0) {
            const totalSpeed = history.reduce((acc, curr) => {
                const totalTokens = (curr.inputTokens || 0) + (curr.outputTokens || 0);
                const seconds = (curr.latency || 1000) / 1000;
                return acc + (totalTokens / seconds);
            }, 0);
            avgSpeed = Math.round(totalSpeed / history.length);
        }
        document.getElementById("kpiSpeed").textContent = `${avgSpeed} t/s`;


        // 2. Render History Table
        renderHistoryTable(history);

    } catch (e) {
        console.error("Error loading stats:", e);
    }
}



function renderHistoryTable(history) {
    const tbody = document.getElementById("historyTableBody");
    tbody.replaceChildren(); // Clear content

    if (history.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 5;
        td.style.textAlign = "center";
        td.style.color = "#999";
        td.textContent = "Encara no hi ha dades d'ús.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    // Sort by date desc (assuming mostly sorted by unshift, but good to be sure if we merge)
    // Actually sidebar uses unshift so index 0 is newest.
    
    history.forEach(entry => {
        const tr = document.createElement("tr");
        
        // Date
        const tdDate = document.createElement("td");
        const dateObj = new Date(entry.date);
        tdDate.textContent = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        tr.appendChild(tdDate);
        
        // Model
        const tdModel = document.createElement("td");
        tdModel.textContent = entry.model;
        tr.appendChild(tdModel);

        // Title/Url
        const tdTitle = document.createElement("td");
        if (entry.url) {
            const a = document.createElement("a");
            a.href = entry.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = entry.title || "Sense títol";
            tdTitle.appendChild(a);
        } else {
            tdTitle.textContent = entry.title || "Sense títol";
        }
        tr.appendChild(tdTitle);

        // Tokens
        const tdTokens = document.createElement("td");
        const spanTokens = document.createElement("span");
        spanTokens.title = `Input: ${entry.inputTokens} / Output: ${entry.outputTokens}`;
        spanTokens.textContent = entry.inputTokens + entry.outputTokens;
        tdTokens.appendChild(spanTokens);
        tr.appendChild(tdTokens);
        
        // Time
        const tdTime = document.createElement("td");
        tdTime.textContent = (entry.latency / 1000).toFixed(1) + "s";
        tr.appendChild(tdTime);

        tbody.appendChild(tr);
    });
}

function clearHistory() {
    if (confirm("Estàs segur que vols esborrar l'historial de peticions?")) {
        browser.storage.local.set({ usageHistory: [] }).then(() => {
            loadStatistics();
            showStatus("Historial esborrat.");
        });
    }
}


// --- Cache Management ---

async function updateCacheInfo() {
    try {
        const data = await browser.storage.local.get(null);
        // Count keys starting with summary_cache:
        let count = 0;
        let size = 0;
        
        Object.keys(data).forEach(key => {
            if (key.startsWith("summary_cache:")) {
                count++;
                size += JSON.stringify(data[key]).length;
            }
        });
        
        const sizeStr = (size / 1024).toFixed(1) + " KB";
        const statusEl = document.getElementById("cacheStatus");
        if (statusEl) {
            statusEl.textContent = `${count} resums (${sizeStr})`;
        }
    } catch (e) {
        console.error("Error reading cache info:", e);
    }
}

async function clearCache() {
    if (!confirm("Estàs segur que vols esborrar la memòria cau de resums?")) return;
    
    try {
        const data = await browser.storage.local.get(null);
        const keysToRemove = Object.keys(data).filter(k => k.startsWith("summary_cache:"));
        
        await browser.storage.local.remove(keysToRemove);
        updateCacheInfo();
        showStatus("Memòria de resums esborrada.");
    } catch (e) {
        console.error("Error clearing cache:", e);
        showStatus("Error esborrant la memòria cau.");
    }
}

// --- Event Listeners ---
document.addEventListener("DOMContentLoaded", restoreOptions);
document.querySelector("#save").addEventListener("click", saveOptions);
document.querySelector("#saveCustom").addEventListener("click", saveOptions);
document.querySelector("#saveExtensions").addEventListener("click", saveOptions);
document.querySelector("#resetTemplate").addEventListener("click", resetTemplate);
document.querySelector("#resetObsidianTemplate").addEventListener("click", resetObsidianTemplate);
document.querySelector("#checkModels").addEventListener("click", listModels);
document.getElementById("clearHistory").addEventListener("click", clearHistory);
document.getElementById("clearCache").addEventListener("click", clearCache);

// --- About Links (CSP Safe) ---
document.getElementById("btnGithub").addEventListener("click", () => {
    window.open("https://github.com/xxxaau/extensio-resumir-contingut", "_blank");
});
document.getElementById("btnIssues").addEventListener("click", () => {
    window.open("https://github.com/xxxaau/extensio-resumir-contingut/issues", "_blank");
});
document.getElementById("linkAuthor").addEventListener("click", (e) => {
    e.preventDefault();
    window.open("https://sergi.xaudiera.xyz", "_blank");
});
