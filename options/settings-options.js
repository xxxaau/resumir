// options/settings-options.js
// Gestió de les opcions: desar, restaurar, restablir defaults

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
