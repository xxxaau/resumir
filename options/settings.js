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

const DEFAULT_DEEP_DIVE_PROMPT = `Actua com un expert analista. Proporciona una anàlisi profunda i exhaustiva del contingut següent.
Inclou arguments detallats, evidències mencionades i matisos importants.
Estructura la resposta amb seccions clares.
Respon SEMPRE en CATALÀ.`;

// --- Navigation Logic ---

// Event Delegation for Sidebar Navigation (Static & Dynamic)
document.querySelector('.sidebar').addEventListener('click', (e) => {
    // Traverse up to find .nav-item
    const item = e.target.closest('.nav-item');
    if (!item) return;

    // Remove active class from all
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));

    // Add to current
    item.classList.add('active');
    const tabId = item.getAttribute('data-tab');
    const tab = document.getElementById(`tab-${tabId}`);
    if (tab) {
        tab.classList.add('active');
    }
});

// Navigate to tab helper
function navigateToTab(tabId) {
    // Find nav item (might be dynamic)
    const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    
    // Simulate click if exists, otherwise manually switch
    if (navItem) {
        navItem.click();
    } else {
        // Fallback for sub-tabs not in sidebar (shouldn't happen with new design, but safety)
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
    }
}

// --- Dynamic Sidebar Logic ---
function updateSidebar() {
    const list = document.getElementById("activeExtensionsList");
    const header = document.getElementById("activeExtensionsHeader");
    list.replaceChildren(); // Clear

    const extensions = [
        { id: "obsidian", label: "Obsidian", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>' },
        { id: "markdown", label: "Markdown", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V7l4 5 4-5v10"/><path d="M15 7h2a5 5 0 0 1 0 10h-2V7z"/></svg>' },
        { id: "deepdive", label: "Aprofundiment", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"/></svg>' },
        { id: "bionic", label: "Lectura Biònica", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' }
    ];

    let count = 0;
    extensions.forEach(ext => {
        // Special case for ID construction if needed, but 'enableObsidian', 'enableMarkdown', 'enableDeepdive', 'enableBionic' match
        const checkboxId = "enable" + ext.id.charAt(0).toUpperCase() + ext.id.slice(1);
        const checkbox = document.getElementById(checkboxId);
        
        if (checkbox && checkbox.checked) {
            count++;
            const btn = document.createElement("button");
            btn.className = "nav-item dynamic-extension";
            btn.setAttribute("data-tab", ext.id);
            btn.innerHTML = `${ext.icon}${ext.label}`;
            
            if (document.getElementById(`tab-${ext.id}`)?.classList.contains('active')) {
                btn.classList.add('active');
            }

            list.appendChild(btn);
        }
    });

    if (count > 0) {
        header.style.display = "block";
    } else {
        header.style.display = "none";
    }
}

// --- Options Management ---

function saveOptions(e) {
  if(e) e.preventDefault();
  
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
    obsidianTemplate: document.querySelector("#obsidianTemplate").value,

    enableBionic: document.querySelector("#enableBionic").checked,
    bionicFixation: parseInt(document.querySelector("#bionicFixation").value),
    bionicFont: document.querySelector("#bionicFont").value,
    bionicLineHeight: document.querySelector("#bionicLineHeight").value,

    enableDeepdive: document.querySelector("#enableDeepdive").checked,
    deepDivePrompt: document.querySelector("#deepDivePrompt").value
  };


  Promise.all([
      browser.storage.sync.set(settings),
      browser.storage.local.set(settings)
  ]).then(() => {
     showStatus("Configuració guardada correctament!");
     updateSidebar(); 
  }).catch(err => {
     console.error("Error saving options:", err);
     showStatus("Error guardant configuració.");
  });
}

function restoreOptions() {
  browser.storage.sync.get([
      "apiKey", "modelName", "theme", "systemPrompt", 
      "enableMarkdown", "markdownTemplate",
      "enableObsidian", "obsidianVault", "obsidianPath", "obsidianTemplate",
      "enableBionic", "enableDeepdive", "enableDeepDive", "deepDivePrompt"
  ]).then(result => {
    document.querySelector("#apiKey").value = result.apiKey || "";
    document.querySelector("#modelName").value = result.modelName || "gemini-1.5-flash-latest";
    document.querySelector("#themeSelect").value = result.theme || "system";
    document.querySelector("#systemPrompt").value = result.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    document.querySelector("#enableMarkdown").checked = result.enableMarkdown === true;
    document.querySelector("#markdownTemplate").value = result.markdownTemplate || DEFAULT_MARKDOWN_TEMPLATE;

    document.querySelector("#enableObsidian").checked = result.enableObsidian === true;
    document.querySelector("#obsidianVault").value = result.obsidianVault || "Obsidian";
    document.querySelector("#obsidianPath").value = result.obsidianPath || "[4 Arxiu/Notes/]YYYY/gggg-[W]ww";
    document.querySelector("#obsidianTemplate").value = result.obsidianTemplate || DEFAULT_OBSIDIAN_TEMPLATE;

    document.querySelector("#enableBionic").checked = result.enableBionic === true;
    document.querySelector("#bionicFixation").value = result.bionicFixation || 45;
    document.querySelector("#bionicFixationValue").textContent = (result.bionicFixation || 45) + "%";
    document.querySelector("#bionicFont").value = result.bionicFont || "sans-serif";
    document.querySelector("#bionicLineHeight").value = result.bionicLineHeight || "1.5";

    // Handle migration/fallback for Deep Dive
    const isDeepDiveEnabled = result.enableDeepdive === true || result.enableDeepDive === true;
    document.querySelector("#enableDeepdive").checked = isDeepDiveEnabled;
    document.querySelector("#deepDivePrompt").value = result.deepDivePrompt || DEFAULT_DEEP_DIVE_PROMPT;

    updateSidebar();
    updateCacheInfo();
    loadStatistics();

  });

  const manifest = browser.runtime.getManifest();
  document.getElementById("appVersion").textContent = manifest.version;
}
 
// Real-time fixation value update
document.getElementById("bionicFixation").addEventListener("input", (e) => {
    document.getElementById("bionicFixationValue").textContent = e.target.value + "%";
});

// Handle "Configure" buttons in extension list
document.querySelectorAll('.btn-icon[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.currentTarget.getAttribute('data-target');
        navigateToTab(target);
    });
});

// Handle "Live" Toggles in extension list
const extensionToggles = ["enableObsidian", "enableMarkdown", "enableDeepdive", "enableBionic"];
extensionToggles.forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
        updateSidebar();
        saveOptions(); // Auto-save on toggle? or just update visuals? User implies toggle == active. Safer to save.
    });
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

const PAGE_SIZE = 20;
let currentPage = 1;

async function loadStatistics() {
    try {
        const data = await browser.storage.local.get(["stats", "usageHistory"]);
        const stats = data.stats || { articles: 0, tokens: 0 };
        const history = data.usageHistory || []; // Array of {date, title, url, model, inputTokens, outputTokens, latency}

        // 1. Update KPI Cards
        // Use standard element IDs as defined in the new HTML
        const elRequests = document.getElementById("kpiRequests");
        const elTokens = document.getElementById("kpiTokens");
        const elSpeed = document.getElementById("kpiSpeed");

        if(elRequests) elRequests.textContent = stats.articles;
        if(elTokens) elTokens.textContent = stats.tokens.toLocaleString();
        
        // Calculate Avg Speed (Tokens / Second)
        let avgSpeed = 0;
        if (history.length > 0) {
            const totalSpeed = history.reduce((acc, curr) => {
                const totalTokens = (curr.inputTokens || 0) + (curr.outputTokens || 0);
                const seconds = (curr.latency || 1000) / 1000;
                return acc + (totalTokens / seconds);
            }, 0);
            avgSpeed = Math.round(totalSpeed / history.length);
        }
        if(elSpeed) elSpeed.textContent = `${avgSpeed} t/s`;

        // Update legacy stats in General tab if they still exist (stats-details)
        const elStatsTokens = document.querySelector("#statsTokens");
        const elStatsCost = document.querySelector("#statsCost");
        if (elStatsTokens) elStatsTokens.textContent = stats.tokens.toLocaleString();
        if (elStatsCost) {
             const costUSD = (stats.tokens / 1000000) * 0.10;
             const costEUR = costUSD * 0.92;
             elStatsCost.textContent = costEUR.toLocaleString('ca-ES', { style: 'currency', currency: 'EUR', minimumFractionDigits: 6 });
        }


        // 2. Render History Table with Pagination
        // Sort history by date desc (newest first) if not already
        // Assuming history is appended, so we might want to reverse it for display
        const sortedHistory = [...history].reverse();

        const visibleCount = currentPage * PAGE_SIZE;
        const visibleHistory = sortedHistory.slice(0, visibleCount);
        
        renderHistoryTable(visibleHistory);

        // 3. Manage Load More Button
        const loadMoreBtn = document.getElementById("loadMoreHistory");
        if (loadMoreBtn) {
            if (sortedHistory.length > visibleCount) {
                loadMoreBtn.style.display = "block";
                loadMoreBtn.onclick = () => {
                    currentPage++;
                    loadStatistics();
                };
            } else {
                loadMoreBtn.style.display = "none";
            }
        }

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
            currentPage = 1; // Reset pagination
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

// Bind all save buttons to saveOptions
const saveBtns = ["save", "saveCustom", "saveExtensions", "saveObsidian", "saveMarkdown", "saveDeepDive", "saveBionic"];
saveBtns.forEach(id => {
    const btn = document.querySelector("#" + id);
    if(btn) btn.addEventListener("click", saveOptions);
});


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

