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
IMPORTANT: Respon directament amb el resultat de l'anàlisi. NO comencis saludant ni incloguis cap introducció de l'estil "Com a analista expert, proporciono...".
Respon SEMPRE en CATALÀ.`;

const DEFAULT_SCIENCE_PROMPT = `Ets un científic amb àmplia trajectora acadèmica. La teva tasca és validar la veracitat científica del contingut i generar un resum en CATALÀ. Assenyala de forma directa afirmacions dubtoses o desviacions del consens actual.

CRITERIS IMPORTANTS:
1. Respon SEMPRE en CATALÀ.
2. NO incloguis cap frase introductòria (ex: "Aquí teniu el resum...", "A continuació...").
3. NO incloguis el títol "**Resum Executiu**". Comença DIRECTAMENT amb el primer paràgraf del resum.
4. Tingues sempre una visió crítica
5. Sigues molt acurat i sobretot estigues segur de la resposta encara que tardis mé temps.
6. IMPORTANT: Respon ÚNICAMENT amb els punts d'avaluació.

CRITERIS SOBRE LES FONTS
* Si no trobes la font exacta, digues 'No ho trobo'.
* No t'inventis cap títol ni autor.
* Verifica cada enllaç abans de mostrar-lo.
* Prioritza revistes indexades (Nature, Science, Elsevier, etc.).

Estructura de la resposta:
[Aquí va directament el paràgraf del resum executiu de màxim 150 paraules, sense cap títol previ]

### Punts Clau
- [Llista de 5-10 punts essencials]

### Referències
- [Màxim 5 referències reals altament reputades, incloent els seus respectius enllaços (URL o DOI).]`;

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
        { id: "resum", label: "Resum", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' },
        { id: "obsidian", label: "Obsidian", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>' },
        { id: "markdown", label: "Markdown", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V7l4 5 4-5v10"/><path d="M15 7h2a5 5 0 0 1 0 10h-2V7z"/></svg>' },
        { id: "deepdive", label: "Aprofundiment", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"/></svg>' },
        { id: "bionic", label: "Lectura biònica", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' },
        { id: "science", label: "Validació científica", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-4.734 7.1A4 4 0 0 0 7 20h10a4 4 0 0 0 3.406-6.102l-4.734-7.1A4 4 0 0 1 15 4.789V2"/><path d="M9 2h6"/><path d="M14 15h-4"/><path d="M16 11h-4"/></svg>' }
    ];

    const currentOrder = getCurrentExtensionOrder();
    extensions.sort((a, b) => {
        const indexA = currentOrder.indexOf(a.id);
        const indexB = currentOrder.indexOf(b.id);
        const posA = indexA === -1 ? 999 : indexA;
        const posB = indexB === -1 ? 999 : indexB;
        return posA - posB;
    });

    let count = 0;
    extensions.forEach(ext => {
        // Special case for ID construction if needed, but 'enableObsidian', 'enableMarkdown', 'enableDeepdive', 'enableBionic' match
        const checkboxId = ext.id === "resum" ? "enableResum" : "enable" + ext.id.charAt(0).toUpperCase() + ext.id.slice(1);
        const checkbox = document.getElementById(checkboxId);
        
        if (checkbox && checkbox.checked) {
            count++;
            const btn = document.createElement("button");
            btn.className = "nav-item dynamic-extension";
            btn.setAttribute("data-tab", ext.id);
            
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(ext.icon, "image/svg+xml");
            btn.appendChild(svgDoc.documentElement);
            btn.appendChild(document.createTextNode(ext.label));
            
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
    bionicWeight: document.querySelector("#bionicWeight").value,
    bionicLineHeight: document.querySelector("#bionicLineHeight").value,

    enableDeepdive: document.querySelector("#enableDeepdive").checked,
    deepDivePrompt: document.querySelector("#deepDivePrompt").value,
    
    enableScience: document.querySelector("#enableScience").checked,
    sciencePrompt: document.querySelector("#sciencePrompt").value,

    enableResum: document.querySelector("#enableResum").checked,

    // Configura l'ordre de les extensions
    extensionOrder: getCurrentExtensionOrder()
  };


  Promise.all([
      ext.storage.sync.set(settings)
  ]).then(() => {
     showStatus("Configuració guardada correctament!");
     updateSidebar(); 
  }).catch(err => {
     console.error("Error saving options:", err);
     showStatus("Error guardant configuració.");
  });
}

function restoreOptions() {
  const configKeys = ["apiKey", "modelName", "theme", "systemPrompt", 
    "enableMarkdown", "markdownTemplate", "enableObsidian", "obsidianVault", 
    "obsidianPath", "obsidianTemplate", "enableBionic", "bionicFixation", 
    "bionicFont", "bionicWeight", "bionicLineHeight", "enableDeepdive", "deepDivePrompt", 
    "enableScience", "sciencePrompt", "enableResum", "extensionOrder"];
    
  ext.storage.sync.get(configKeys).then((data) => {
    document.querySelector("#apiKey").value = data.apiKey || "";
    document.querySelector("#modelName").value = data.modelName || "gemini-2.5-flash";
    document.querySelector("#themeSelect").value = data.theme || "system";
    document.querySelector("#systemPrompt").value = data.systemPrompt || DEFAULT_SYSTEM_PROMPT;
    
    document.querySelector("#enableMarkdown").checked = data.enableMarkdown === true;
    document.querySelector("#markdownTemplate").value = data.markdownTemplate || DEFAULT_MARKDOWN_TEMPLATE;

    document.querySelector("#enableObsidian").checked = data.enableObsidian === true;
    document.querySelector("#obsidianVault").value = data.obsidianVault || "Obsidian";
    document.querySelector("#obsidianPath").value = data.obsidianPath || "[4 Arxiu/Notes/]YYYY/gggg-[W]ww";
    document.querySelector("#obsidianTemplate").value = data.obsidianTemplate || DEFAULT_OBSIDIAN_TEMPLATE;

    document.querySelector("#enableBionic").checked = data.enableBionic === true;
    document.querySelector("#bionicFixation").value = data.bionicFixation || 30;
    document.querySelector("#bionicFixationValue").textContent = (data.bionicFixation || 30) + "%";
    let savedFont = data.bionicFont || "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const fontSelect = document.querySelector("#bionicFont");
    if (!Array.from(fontSelect.options).some(opt => opt.value === savedFont)) {
        savedFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    }
    fontSelect.value = savedFont;
    document.querySelector("#bionicWeight").value = data.bionicWeight || "700";
    document.querySelector("#bionicLineHeight").value = data.bionicLineHeight || "1.5";

    // Handle migration/fallback for Deep Dive
    document.querySelector("#enableDeepdive").checked = data.enableDeepdive === true;

    if (data.deepDivePrompt !== undefined) document.querySelector("#deepDivePrompt").value = data.deepDivePrompt;
    else document.querySelector("#deepDivePrompt").value = DEFAULT_DEEP_DIVE_PROMPT; // Default if not set

    if (data.enableScience !== undefined) document.querySelector("#enableScience").checked = data.enableScience;
    else document.querySelector("#enableScience").checked = false; // Default to false if not set

    if (data.sciencePrompt !== undefined) document.querySelector("#sciencePrompt").value = data.sciencePrompt;
    else document.querySelector("#sciencePrompt").value = DEFAULT_SCIENCE_PROMPT;

    // Resum: actiu per defecte
    document.querySelector("#enableResum").checked = data.enableResum !== false;

    if (data.extensionOrder && Array.isArray(data.extensionOrder)) {
        applyExtensionOrder(data.extensionOrder);
    }

    updateSidebar();
    updateCacheInfo();
    loadStatistics();

  });

  const manifest = ext.runtime.getManifest();
  document.getElementById("appVersion").textContent = manifest.version;

  // Filtrar tipografies de Lectura Biònica segons SO
  const isMac = navigator.userAgent.toLowerCase().includes('mac');
  const osClassToHide = isMac ? '.os-windows' : '.os-mac';
  document.querySelectorAll(`#bionicFont ${osClassToHide}`).forEach(el => {
      el.style.display = 'none';
      el.disabled = true; // Prevé que es seleccioni accidentalment l'opció
  });
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
// Nota: només actualitza la UI de la barra lateral de configuració;
// la persistència real es fa quan l'usuari prem un botó de "Desar" explícit.
const extensionToggles = ["enableObsidian", "enableMarkdown", "enableDeepdive", "enableBionic"];
extensionToggles.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
        updateSidebar();
    });
});


function resetTemplate() {
    document.querySelector("#markdownTemplate").value = DEFAULT_MARKDOWN_TEMPLATE;
}

function resetObsidianTemplate() {
    document.querySelector("#obsidianTemplate").value = DEFAULT_OBSIDIAN_TEMPLATE;
}

function resetSystemPrompt() {
    document.querySelector("#systemPrompt").value = DEFAULT_SYSTEM_PROMPT;
}

function resetDeepDivePrompt() {
    document.querySelector("#deepDivePrompt").value = DEFAULT_DEEP_DIVE_PROMPT;
}

function resetSciencePrompt() {
    document.querySelector("#sciencePrompt").value = DEFAULT_SCIENCE_PROMPT;
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
// CURATED_MODELS ve de shared/models.js (carregat abans d'aquest fitxer)

function modelNote(cm) {
    const rpd = cm.rpd === 999999 ? "Il·limitat" : `${cm.rpd} req/dia`;
    return `$${cm.priceIn}/$${cm.priceOut} · ${rpd}`;
}

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
  modelsList.replaceChildren();

  // Always show curated models first
  const curatedHeader = document.createElement("div");
  curatedHeader.style.cssText = "font-weight:bold; font-size:0.8em; color:#666; padding:4px 0 2px; border-bottom:1px solid #eee; margin-bottom:4px;";
  curatedHeader.textContent = "✦ Models recomanats";
  modelsList.appendChild(curatedHeader);

  CURATED_MODELS.forEach(cm => {
      const div = document.createElement("div");
      div.style.cssText = "display:flex; justify-content:space-between; align-items:center; padding:4px 0;";
      const nameSpan = document.createElement("span");
      nameSpan.textContent = cm.label;
      nameSpan.style.fontWeight = "500";
      const noteSpan = document.createElement("span");
      noteSpan.textContent = modelNote(cm);
      noteSpan.style.cssText = "font-size:0.75em; color:#888;";
      div.appendChild(nameSpan);
      div.appendChild(noteSpan);
      div.style.cursor = "pointer";
      div.onclick = () => {
          document.querySelector("#modelName").value = cm.id;
          modelsList.style.display = "none";
      };
      modelsList.appendChild(div);
  });

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
        headers: { "x-goog-api-key": apiKey }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`[010] ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    
    const curatedIds = new Set(CURATED_MODELS.map(m => m.id));
    const otherModels = (data.models || [])
        .filter(m =>
            m.supportedGenerationMethods?.includes("generateContent") &&
            !/embedding|aqa|robotics|vision|image/i.test(m.name)
        )
        .map(m => m.name.replace("models/", ""))
        .filter(id => !curatedIds.has(id));

    if (otherModels.length > 0) {
        const otherHeader = document.createElement("div");
        otherHeader.style.cssText = "font-weight:bold; font-size:0.8em; color:#666; padding:8px 0 2px; border-bottom:1px solid #eee; margin-bottom:4px;";
        otherHeader.textContent = "Altres models disponibles";
        modelsList.appendChild(otherHeader);
        otherModels.forEach(model => {
            const div = document.createElement("div");
            div.textContent = model;
            div.style.cursor = "pointer";
            div.onclick = () => {
                document.querySelector("#modelName").value = model;
                modelsList.style.display = "none";
            };
            modelsList.appendChild(div);
        });
    }
  } catch (err) {
    const span = document.createElement("span");
    span.style.cssText = "color:red; font-size:0.85em;";
    span.textContent = `Error API: ${err.message}`;
    modelsList.appendChild(span);
  } finally {
    checkBtn.textContent = "Cercar models";
  }
}


// --- Statistics Logic ---

let PAGE_SIZE = 20;
let currentPage = 1;
let totalPages = 1;

async function loadStatistics() {
    try {
        const data = await ext.storage.local.get(["stats", "usageHistory", "pageSize"]);
        const stats = data.stats || { articles: 0, tokens: 0 };
        const history = data.usageHistory || []; // Array of {date, title, url, model, inputTokens, outputTokens, latency}

        if (data.pageSize) {
            PAGE_SIZE = data.pageSize;
            const selectEl = document.getElementById("pageSizeSelect");
            if (selectEl) selectEl.value = PAGE_SIZE.toString();
        }

        // 1. Update KPI Cards
        const elArticles = document.getElementById("statsArticles");
        const elTimeSaved = document.getElementById("kpiTimeSaved");

        if(elArticles) elArticles.textContent = history.length;
        
        // Calculate Time Saved (Estimated reading time - wait time)
        // Assume 1 token ~ 0.75 words, Average reading speed = 250 wpm.
        // Therefore, 1 token takes ~0.18 seconds to read. We use 0.2s for simplicity.
        let timeSavedSeconds = 0;
        if (history.length > 0) {
            timeSavedSeconds = history.reduce((acc, curr) => {
                const readSecs = (curr.inputTokens || 0) * 0.2;
                const waitSecs = (curr.latency || 0) / 1000;
                return acc + Math.max(0, readSecs - waitSecs);
            }, 0);
        }
        
        const hours = Math.floor(timeSavedSeconds / 3600);
        const minutes = Math.floor((timeSavedSeconds % 3600) / 60);
        if(elTimeSaved) elTimeSaved.textContent = `${hours}h ${minutes}m`;

        // Water consumption stats
        const WATER_ML = 0.26;
        const GLASS_ML = 300;
        const todayStr = new Date().toISOString().slice(0, 10);

        const todayCount = history.filter(e => {
            const ts = e.date || e.timestamp; // cache.js uses 'date'
            return ts && new Date(ts).toISOString().slice(0, 10) === todayStr;
        }).length;
        const totalCount = history.length;

        const todayMl  = todayCount  * WATER_ML;
        const totalMl  = totalCount  * WATER_ML;

        function fmtWater(ml) {
            if (ml < 1)    return ml.toFixed(2) + " ml";
            if (ml < GLASS_ML) return ml.toFixed(1) + " ml";
            return (ml / GLASS_ML).toFixed(2) + " gots";
        }

        const elWaterToday = document.getElementById("kpiWaterToday");
        const elWaterTotal = document.getElementById("kpiWaterTotal");
        if (elWaterToday) elWaterToday.textContent = fmtWater(todayMl);
        if (elWaterTotal) elWaterTotal.textContent = `Total acumulat: ${fmtWater(totalMl)}`;

        // Render Bar Chart
        renderDailyChart(history);

        // Grouped History Table
        renderGroupedHistoryTable(history);

        // 2. Render History Table with Pagination
        // Sort history by date desc (newest first)
        const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
        
        totalPages = Math.ceil(sortedHistory.length / PAGE_SIZE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;

        const startIndex = (currentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        const visibleHistory = sortedHistory.slice(startIndex, endIndex);
        
        renderHistoryTable(visibleHistory);

        // 3. Manage Pagination UI
        const prevBtn = document.getElementById("prevPage");
        const nextBtn = document.getElementById("nextPage");
        const pageInfo = document.getElementById("pageInfo");

        if (prevBtn) prevBtn.disabled = currentPage === 1;
        if (nextBtn) nextBtn.disabled = currentPage === totalPages;
        if (pageInfo) pageInfo.textContent = `Pàgina ${currentPage} de ${totalPages}`;

    } catch (e) {
        console.error("Error loading stats:", e);
    }
}




// --- Reordering Logic ---

function getCurrentExtensionOrder() {
    const list = document.querySelector(".extensions-list");
    const items = Array.from(list.querySelectorAll(".extension-item"));
    return items.map(item => {
        const actionDiv = item.querySelector(".extension-actions");
        return actionDiv ? actionDiv.getAttribute("data-extension-id") : null;
    }).filter(id => id !== null);
}

function applyExtensionOrder(order) {
    // Migrate orders that don't include 'resum' yet
    if (!order.includes("resum")) {
        order = ["resum", ...order];
        ext.storage.sync.set({ extensionOrder: order });
    }

    // Migrate old default orders (pre-resum)
    const oldDefault1 = JSON.stringify(["resum", "obsidian", "markdown", "deepdive", "bionic", "science"]);
    const oldDefault2 = JSON.stringify(["resum", "deepdive", "science", "obsidian", "markdown", "bionic"]);
    const oldDefault3 = JSON.stringify(["resum", "science", "deepdive", "obsidian", "markdown", "bionic"]);
    const currentOrderStr = JSON.stringify(order);
    
    if (currentOrderStr === oldDefault1 || currentOrderStr === oldDefault2 || currentOrderStr === oldDefault3) {
        order = ["resum", "science", "deepdive", "obsidian", "markdown", "bionic"];
        ext.storage.sync.set({ extensionOrder: order });
    }

    const list = document.querySelector(".extensions-list");
    const items = Array.from(list.querySelectorAll(".extension-item"));
    const itemsMap = new Map();
    
    items.forEach(item => {
        const id = item.querySelector(".extension-actions").getAttribute("data-extension-id");
        if (id) itemsMap.set(id, item);
    });

    // Re-append items in order
    order.forEach(id => {
        const item = itemsMap.get(id);
        if (item) {
            list.appendChild(item); // Moves it to the end (reordering)
            itemsMap.delete(id);
        }
    });

    // Append any remaining items (new ones?)
    itemsMap.forEach(item => {
        list.appendChild(item);
    });

    updateMoveButtonsState();
}

function moveExtension(extensionId, direction) {
    const list = document.querySelector(".extensions-list");
    const item = list.querySelector(`.extension-actions[data-extension-id="${extensionId}"]`).closest(".extension-item");
    if (!item) return;

    if (direction === "up") {
        const prev = item.previousElementSibling;
        if (prev) {
            list.insertBefore(item, prev);
        }
    } else if (direction === "down") {
        const next = item.nextElementSibling;
        if (next) {
            list.insertBefore(next, item);
        }
    }

    updateMoveButtonsState();
    updateSidebar();
}

function updateMoveButtonsState() {
    const list = document.querySelector(".extensions-list");
    const items = list.querySelectorAll(".extension-item");
    
    items.forEach((item, index) => {
        const upBtn = item.querySelector(".btn-move-up");
        const downBtn = item.querySelector(".btn-move-down");
        
        if (upBtn) upBtn.disabled = (index === 0);
        if (downBtn) downBtn.disabled = (index === items.length - 1);
    });
}


function getRelativeTime(dateInput) {
    const date = new Date(dateInput);
    const now = new Date();
    
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return "fa uns segons";
    if (diffMins < 60) return `fa ${diffMins} minuts`;
    if (diffHours < 24 && now.getDate() === date.getDate()) {
        if (diffHours === 1) return "fa 1 hora";
        return `fa ${diffHours} hores`;
    }
    
    // For days, calculate calendar day difference
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const inputDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((today - inputDay) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "ahir";
    return `fa ${diffDays} dies`;
}

function renderDailyChart(history) {
    const container = document.getElementById("dailyChartContainer");
    if (!container) return;
    container.replaceChildren();

    // Initialize last 7 days count
    const days = {};
    const today = new Date();
    today.setHours(0,0,0,0);
    // Build array of keys from 6 days ago to today
    for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        days[d.toLocaleDateString('ca-ES', { weekday: 'short' })] = 0;
    }

    // Count history in those days
    history.forEach(entry => {
        const entryDate = new Date(entry.date);
        entryDate.setHours(0,0,0,0);
        const diffTime = today - entryDate;
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)); 
        if (diffDays <= 6 && diffDays >= 0) {
             const key = entryDate.toLocaleDateString('ca-ES', { weekday: 'short' });
             if(days[key] !== undefined) days[key]++;
        }
    });

    const maxCount = Math.max(...Object.values(days), 1);

    // Draw bars
    Object.entries(days).forEach(([dayLabel, count]) => {
        const barWrapper = document.createElement("div");
        barWrapper.style.display = "flex";
        barWrapper.style.flexDirection = "column";
        barWrapper.style.alignItems = "center";
        barWrapper.style.flex = "1";
        barWrapper.style.height = "100%";
        barWrapper.style.justifyContent = "flex-end";
        
        const bar = document.createElement("div");
        const heightPct = (count / maxCount) * 80; // max 80% height for visual padding
        bar.style.height = Math.max(heightPct, 2) + "%"; 
        bar.style.width = "70%";
        bar.style.backgroundColor = "var(--button-hover-bg)";
        bar.style.borderRadius = "4px 4px 0 0";
        bar.style.transition = "height 0.3s";
        
        if (count === 1) {
            bar.title = `1 article resumit`;
        } else {
            bar.title = `${count} articles resumits`;
        }

        const label = document.createElement("div");
        label.textContent = dayLabel;
        label.style.fontSize = "12px";
        label.style.marginTop = "5px";
        label.style.color = "var(--text-muted)";
        label.style.textTransform = "capitalize";

        barWrapper.appendChild(bar);
        barWrapper.appendChild(label);
        container.appendChild(barWrapper);
    });
}

function renderGroupedHistoryTable(history) {
    const tbody = document.getElementById("groupedTableBody");
    if (!tbody) return;
    tbody.replaceChildren(); // Clear content

    if (history.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 4;
        td.style.textAlign = "center";
        td.style.color = "#999";
        td.textContent = "Encara no hi ha dades d'ús.";
        tr.appendChild(td);
        tbody.appendChild(tr);
        return;
    }

    // Agrubar per data (YYYY-MM-DD) i model
    const groups = {};
    history.forEach(entry => {
        const dateObj = new Date(entry.date);
        const dayKey = dateObj.toLocaleDateString(); // Format local curt
        // Sort keys need YYYY-MM-DD to sort properly
        const sortKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
        const model = entry.model || "gemini-1.5-flash"; // Fallback antic
        
        const key = `${sortKey}|${dayKey}|${model}`;
        if (!groups[key]) {
            groups[key] = { sortKey, dayKey, model, requests: 0 };
        }
        groups[key].requests += 1;
    });

    // Ordenar per data (descendent) i després model (ascendent)
    const sortedGroups = Object.values(groups).sort((a, b) => {
        if (a.sortKey !== b.sortKey) {
            return b.sortKey.localeCompare(a.sortKey);
        }
        return a.model.localeCompare(b.model);
    });

    sortedGroups.forEach(group => {
        const tr = document.createElement("tr");
        
        // Date
        const tdDate = document.createElement("td");
        tdDate.textContent = group.dayKey;
        tr.appendChild(tdDate);
        
        // Model
        const tdModel = document.createElement("td");
        const code = document.createElement("code");
        code.style.fontSize = "0.85em";
        code.style.padding = "2px 4px";
        code.style.borderRadius = "4px";
        code.style.backgroundColor = "var(--bg-secondary)";
        code.textContent = group.model;
        tdModel.appendChild(code);
        tr.appendChild(tdModel);

        // Requests
        const tdReq = document.createElement("td");
        tdReq.style.textAlign = "right";
        tdReq.textContent = group.requests;
        tr.appendChild(tdReq);

        // Water
        const tdWater = document.createElement("td");
        tdWater.style.textAlign = "right";
        tdWater.style.color = "var(--text-muted)";
        const waterMl = group.requests * 0.26;
        tdWater.textContent = waterMl.toFixed(2);
        tr.appendChild(tdWater);

        tbody.appendChild(tr);
    });
}

function renderHistoryTable(history) {
    const tbody = document.getElementById("historyTableBody");
    tbody.replaceChildren(); // Clear content

    if (history.length === 0) {
        const tr = document.createElement("tr");
        const td = document.createElement("td");
        td.colSpan = 2;
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
        tdDate.textContent = getRelativeTime(dateObj);
        tdDate.title = dateObj.toLocaleDateString() + " " + dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        tr.appendChild(tdDate);
        
        // Title/Url
        const tdTitle = document.createElement("td");
        let prefix = entry.type === "deep" ? "+ " : "";
        
        if (entry.url) {
            const a = document.createElement("a");
            a.href = entry.url;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.textContent = prefix + (entry.title || "Sense títol");
            tdTitle.appendChild(a);
        } else {
            tdTitle.textContent = prefix + (entry.title || "Sense títol");
        }
        tr.appendChild(tdTitle);

        tbody.appendChild(tr);
    });
}

function clearHistory() {
    if (confirm("Estàs segur que vols esborrar l'historial de peticions?")) {
        ext.storage.local.set({ usageHistory: [] }).then(() => {
            currentPage = 1; // Reset pagination
            loadStatistics();
            showStatus("Historial esborrat.");
        });
    }
}


// --- Cache Management ---

async function updateCacheInfo() {
    try {
        const data = await ext.storage.local.get(null);
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
        const data = await ext.storage.local.get(null);
        const keysToRemove = Object.keys(data).filter(k => k.startsWith("summary_cache:"));
        
        await ext.storage.local.remove(keysToRemove);
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
const saveBtns = ["save", "saveCustom", "saveExtensions", "saveObsidian", "saveMarkdown", "saveDeepDive", "saveBionic", "saveScience"];
saveBtns.forEach(id => {
    const btn = document.querySelector("#" + id);
    if(btn) btn.addEventListener("click", saveOptions);
});


document.querySelector("#resetTemplate").addEventListener("click", resetTemplate);
document.querySelector("#resetObsidianTemplate").addEventListener("click", resetObsidianTemplate);
document.querySelector("#resetSystemPrompt").addEventListener("click", resetSystemPrompt);
document.querySelector("#resetDeepDive").addEventListener("click", resetDeepDivePrompt);
document.querySelector("#resetScience").addEventListener("click", resetSciencePrompt);
document.querySelector("#checkModels").addEventListener("click", listModels);
document.getElementById("clearHistory").addEventListener("click", clearHistory);
document.getElementById("clearCache").addEventListener("click", clearCache);

// Pagination Event Listeners
document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
        currentPage--;
        loadStatistics();
    }
});

document.getElementById("nextPage")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
        currentPage++;
        loadStatistics();
    }
});

document.getElementById("pageSizeSelect")?.addEventListener("change", (e) => {
    PAGE_SIZE = parseInt(e.target.value, 10);
    ext.storage.local.set({ pageSize: PAGE_SIZE });
    currentPage = 1;
    loadStatistics();
});

// Reordering Event Delegation
document.querySelector(".extensions-list").addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-move-up, .btn-move-down");
    if (!btn) return;

    const actionDiv = btn.closest(".extension-actions");
    const id = actionDiv.getAttribute("data-extension-id");
    const direction = btn.classList.contains("btn-move-up") ? "up" : "down";

    moveExtension(id, direction);
});

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

// Sync model selection with sidebar changes in real-time
ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.modelName && changes.modelName.newValue) {
        const modelEl = document.querySelector("#modelName");
        if (modelEl && modelEl.value !== changes.modelName.newValue) {
            modelEl.value = changes.modelName.newValue;
        }
    }
});
