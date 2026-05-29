/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-options.js
// Gestió de les opcions: desar, restaurar, restablir defaults

// --- Options Management ---

function saveOptions(e) {
  if(e) e.preventDefault();
  
  const apiKeyValue = document.querySelector("#apiKey").value;
  const settings = {
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
    bionicFontSize: document.querySelector("#bionicFontSize").value,
    bionicLineHeight: document.querySelector("#bionicLineHeight").value,

    enableDeepdive: document.querySelector("#enableDeepdive").checked,
    deepDivePrompt: document.querySelector("#deepDivePrompt").value,
    
    enableScience: document.querySelector("#enableScience").checked,
    sciencePrompt: document.querySelector("#sciencePrompt").value,

    enableResum: document.querySelector("#enableResum").checked,

    enableConceptMap: document.querySelector("#enableConceptMap").checked,
    conceptMapPrompt: document.querySelector("#conceptMapPrompt").value,

    // Configura l'ordre de les extensions
    extensionOrder: getCurrentExtensionOrder(),

  };


  Promise.all([
      ext.storage.sync.set(settings),
      ext.storage.local.set({ apiKey: apiKeyValue })
  ]).then(() => {
     showStatus("Configuració guardada correctament!");
     updateSidebar(); 
  }).catch(err => {
     console.error("Error saving options:", err);
     showStatus("Error guardant configuració.");
  });
}

function restoreOptions(syncData, localData) {
    document.querySelector("#apiKey").value = (localData && localData.apiKey) || "";
    document.querySelector("#modelName").value = (syncData && syncData.modelName) || DEFAULT_MODEL_ID;
    document.querySelector("#themeSelect").value = (syncData && syncData.theme) || "system";
    document.querySelector("#systemPrompt").value = (syncData && syncData.systemPrompt) || DEFAULT_SYSTEM_PROMPT;

    document.querySelector("#enableMarkdown").checked = syncData && syncData.enableMarkdown === true;
    document.querySelector("#markdownTemplate").value = (syncData && syncData.markdownTemplate) || DEFAULT_MARKDOWN_TEMPLATE;

    document.querySelector("#enableObsidian").checked = syncData && syncData.enableObsidian === true;
    document.querySelector("#obsidianVault").value = (syncData && syncData.obsidianVault) || "Obsidian";
    document.querySelector("#obsidianPath").value = (syncData && syncData.obsidianPath) || "[4 Arxiu/Notes/]YYYY/gggg-[W]ww";
    document.querySelector("#obsidianTemplate").value = (syncData && syncData.obsidianTemplate) || DEFAULT_OBSIDIAN_TEMPLATE;

    document.querySelector("#enableBionic").checked = syncData && syncData.enableBionic === true;
    document.querySelector("#bionicFixation").value = (syncData && syncData.bionicFixation) || 35;
    document.querySelector("#bionicFixationValue").textContent = ((syncData && syncData.bionicFixation) || 35) + "%";
    let savedFont = (syncData && syncData.bionicFont) || "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    const fontSelect = document.querySelector("#bionicFont");
    if (!Array.from(fontSelect.options).some(opt => opt.value === savedFont)) {
        savedFont = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    }
    fontSelect.value = savedFont;
    document.querySelector("#bionicWeight").value = (syncData && syncData.bionicWeight) || "600";
    document.querySelector("#bionicFontSize").value = (syncData && syncData.bionicFontSize) || "1em";
    document.querySelector("#bionicLineHeight").value = (syncData && syncData.bionicLineHeight) || "1.5";

    document.querySelector("#enableDeepdive").checked = syncData && syncData.enableDeepdive === true;
    document.querySelector("#deepDivePrompt").value = (syncData && syncData.deepDivePrompt !== undefined) ? syncData.deepDivePrompt : DEFAULT_DEEP_DIVE_PROMPT;

    document.querySelector("#enableScience").checked = syncData ? syncData.enableScience === true : false;
    document.querySelector("#sciencePrompt").value = (syncData && syncData.sciencePrompt !== undefined) ? syncData.sciencePrompt : DEFAULT_SCIENCE_PROMPT;

    document.querySelector("#enableResum").checked = syncData ? syncData.enableResum !== false : true;
    document.querySelector("#enableConceptMap").checked = syncData && syncData.enableConceptMap === true;
    document.querySelector("#conceptMapPrompt").value = (syncData && syncData.conceptMapPrompt !== undefined) ? syncData.conceptMapPrompt : DEFAULT_CONCEPTMAP_PROMPT;

    if (syncData && syncData.extensionOrder && Array.isArray(syncData.extensionOrder)) {
        applyExtensionOrder(syncData.extensionOrder);
    }
}

function initializeSettingsPageUI() {
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

function resetConceptMapPrompt() {
    document.querySelector("#conceptMapPrompt").value = DEFAULT_CONCEPTMAP_PROMPT;
}

function resetBionic() {
    document.querySelector("#bionicFixation").value = "35";
    document.querySelector("#bionicFixationValue").textContent = "35%";
    document.querySelector("#bionicFont").value = "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    document.querySelector("#bionicWeight").value = "600";
    document.querySelector("#bionicFontSize").value = "1em";
    document.querySelector("#bionicLineHeight").value = "1.5";
    showStatus("Valors de lectura biònica restaurats als valors per defecte.");
}

function showStatus(text) {
  const status = document.querySelector("#status");
  status.textContent = text;
  status.style.display = "block";
  setTimeout(() => {
    status.style.display = "none";
  }, 2000);
}
