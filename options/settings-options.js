/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-options.js
// Gestió de les opcions: desar, restaurar, restablir defaults

// --- Options Management ---

// Botó «Desar» de cada pestanya de prompt → flag de l'avís de prompt nou que
// aquella pestanya mostra. Els altres botons no toquen cap flag.
const SAVE_BUTTON_UPDATE_KEYS = {
  saveDeepDive:   "deepDivePromptUpdateAvailable",
  saveScience:    "sciencePromptUpdateAvailable",
  saveConceptMap: "conceptMapPromptUpdateAvailable",
  saveSimple:     "simplePromptUpdateAvailable",
};

function saveOptions(e) {
  if(e) e.preventDefault();
  
  // Sense espais, cometes ni prefix «Bearer» (errors habituals en enganxar-la)
  const apiKeyValue = normalizeApiKey(document.querySelector("#apiKey").value);
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
    deepDivePromptCustomized: document.querySelector("#deepDivePrompt").value !== DEFAULT_DEEP_DIVE_PROMPT,

    enableScience: document.querySelector("#enableScience").checked,
    sciencePrompt: document.querySelector("#sciencePrompt").value,
    sciencePromptCustomized: document.querySelector("#sciencePrompt").value !== DEFAULT_SCIENCE_PROMPT,

    enableResum: document.querySelector("#enableResum").checked,
    enablePdf: document.querySelector("#enablePdf").checked,

    enableConceptMap: document.querySelector("#enableConceptMap").checked,
    conceptMapPrompt: document.querySelector("#conceptMapPrompt").value,
    conceptMapPromptCustomized: document.querySelector("#conceptMapPrompt").value !== DEFAULT_CONCEPTMAP_PROMPT,

    enableSimple: document.querySelector("#enableSimple").checked,
    simplePrompt: document.querySelector("#simplePrompt").value,
    simplePromptCustomized: document.querySelector("#simplePrompt").value !== DEFAULT_SIMPLE_PROMPT,

    enableAnki: document.querySelector("#enableAnki").checked,
    ankiVault: document.querySelector("#ankiVault").value,
    ankiPath: document.querySelector("#ankiPath").value || DEFAULT_ANKI_PATH,
    ankiPacket: parseInt(document.querySelector("#ankiPacket").value, 10) || DEFAULT_ANKI_PACKET,
    ankiLang: document.querySelector("#ankiLang").value || DEFAULT_ANKI_LANG,
    ankiPrompt: document.querySelector("#ankiPrompt").value,

    // Configura l'ordre de les extensions
    extensionOrder: getCurrentExtensionOrder(),

  };


  // Netejar NOMÉS el flag d'actualització de la pestanya que es desa (l'usuari
  // ja ha vist aquell avís). Abans es posaven els quatre a false en desar
  // qualsevol cosa (p. ex. el tema), amagant avisos que mai havia vist.
  const clearedUpdateKey = SAVE_BUTTON_UPDATE_KEYS[e && e.currentTarget && e.currentTarget.id];
  if (clearedUpdateKey) settings[clearedUpdateKey] = false;

  Promise.all([
      ext.storage.sync.set(settings),
      ext.storage.local.set({ apiKey: apiKeyValue })
  ]).then(() => {
     showStatus("Configuració desada correctament!");
     updateSidebar(); 
  }).catch(err => {
     console.error("Error saving options:", err);
     showStatus("Error guardant configuració.");
  });
}

/**
 * Desat immediat d'UN canvi discret (interruptor, ordre, tema). Escriu només
 * les claus indicades: NO reutilitza saveOptions, que commitejaria també els
 * prompts i la clau d'API que l'usuari tingui a mig editar a altres pestanyes.
 */
function autosave(patch) {
  return ext.storage.sync.set(patch)
    .then(() => showStatus("Desat"))
    .catch(err => {
      console.error("Error desant automàticament:", err);
      showStatus("No s'ha pogut desar el canvi.");
    });
}

/**
 * «Comprovar»: valida la clau amb una consulta barata i, si funciona, la desa.
 * Abans l'única manera de saber si era vàlida era fer un resum i veure l'error.
 */
async function checkApiKey() {
  const input = document.querySelector("#apiKey");
  const status = document.querySelector("#apiKeyStatus");
  const btn = document.querySelector("#verifyApiKey");
  btn.disabled = true;
  status.textContent = "Comprovant…";
  const result = await verifyApiKey(input.value);
  btn.disabled = false;
  status.textContent = result.message;
  if (result.ok) {
    input.value = result.key;
    await ext.storage.local.set({ apiKey: result.key });
    status.textContent = "Clau vàlida i desada.";
  } else {
    input.focus();
  }
}

function toggleApiKeyVisibility() {
  const input = document.querySelector("#apiKey");
  const btn = document.querySelector("#toggleApiKey");
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  btn.textContent = show ? "Amagar" : "Mostrar";
  btn.setAttribute("aria-pressed", String(show));
  btn.setAttribute("aria-label", show ? "Amagar la clau" : "Mostrar la clau");
}

function restoreOptions(syncData, localData) {
    document.querySelector("#apiKey").value = (localData && localData.apiKey) || "";
    document.querySelector("#modelName").placeholder = DEFAULT_MODEL_ID;
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
    document.querySelector("#bionicFixation").value = (syncData && syncData.bionicFixation) || DEFAULT_BIONIC.fixation;
    document.querySelector("#bionicFixationValue").textContent = ((syncData && syncData.bionicFixation) || DEFAULT_BIONIC.fixation) + "%";
    let savedFont = (syncData && syncData.bionicFont) || DEFAULT_BIONIC.font;
    const fontSelect = document.querySelector("#bionicFont");
    if (!Array.from(fontSelect.options).some(opt => opt.value === savedFont)) {
        savedFont = DEFAULT_BIONIC.font;
    }
    fontSelect.value = savedFont;
    document.querySelector("#bionicWeight").value = (syncData && syncData.bionicWeight) || DEFAULT_BIONIC.weight;
    document.querySelector("#bionicFontSize").value = (syncData && syncData.bionicFontSize) || DEFAULT_BIONIC.fontSize;
    document.querySelector("#bionicLineHeight").value = (syncData && syncData.bionicLineHeight) || DEFAULT_BIONIC.lineHeight;

    document.querySelector("#enableDeepdive").checked = syncData && syncData.enableDeepdive === true;
    document.querySelector("#deepDivePrompt").value = (syncData && syncData.deepDivePrompt !== undefined) ? syncData.deepDivePrompt : DEFAULT_DEEP_DIVE_PROMPT;

    document.querySelector("#enableScience").checked = syncData ? syncData.enableScience === true : false;
    document.querySelector("#sciencePrompt").value = (syncData && syncData.sciencePrompt !== undefined) ? syncData.sciencePrompt : DEFAULT_SCIENCE_PROMPT;

    document.querySelector("#enableResum").checked = syncData ? syncData.enableResum !== false : true;
    document.querySelector("#enablePdf").checked = syncData ? syncData.enablePdf !== false : true;
    document.querySelector("#enableConceptMap").checked = syncData && syncData.enableConceptMap === true;
    document.querySelector("#conceptMapPrompt").value = (syncData && syncData.conceptMapPrompt !== undefined) ? syncData.conceptMapPrompt : DEFAULT_CONCEPTMAP_PROMPT;

    document.querySelector("#enableSimple").checked = syncData && syncData.enableSimple === true;
    document.querySelector("#simplePrompt").value = (syncData && syncData.simplePrompt !== undefined) ? syncData.simplePrompt : DEFAULT_SIMPLE_PROMPT;

    document.querySelector("#enableAnki").checked = syncData ? syncData.enableAnki === true : false;
    // Vault independent: si encara no s'ha configurat per Anki, es pre-omple amb el
    // d'Obsidian (seed de primera càrrega). En desar es fixa i ja és independent.
    document.querySelector("#ankiVault").value = (syncData && syncData.ankiVault !== undefined)
        ? syncData.ankiVault
        : ((syncData && syncData.obsidianVault) || "Obsidian");
    document.querySelector("#ankiPath").value = (syncData && syncData.ankiPath) || DEFAULT_ANKI_PATH;
    document.querySelector("#ankiPacket").value = (syncData && syncData.ankiPacket) || DEFAULT_ANKI_PACKET;
    document.querySelector("#ankiLang").value = (syncData && syncData.ankiLang) || DEFAULT_ANKI_LANG;
    document.querySelector("#ankiPrompt").value = (syncData && syncData.ankiPrompt !== undefined) ? syncData.ankiPrompt : DEFAULT_ANKI_PROMPT;

    // Mostrar banners d'actualització de prompts si n'hi ha
    if (syncData) {
        showPromptUpdateBanner("deepdive", syncData.deepDivePromptUpdateAvailable);
        showPromptUpdateBanner("science", syncData.sciencePromptUpdateAvailable);
        showPromptUpdateBanner("conceptmap", syncData.conceptMapPromptUpdateAvailable);
        showPromptUpdateBanner("simple", syncData.simplePromptUpdateAvailable);
    }

    if (syncData && syncData.extensionOrder && Array.isArray(syncData.extensionOrder)) {
        applyExtensionOrder(syncData.extensionOrder);
    } else {
        // Sense ordre desat: apliquem l'ordre per defecte perquè la llista (i el
        // que captura getCurrentExtensionOrder en desar) reflecteixi el default.
        applyExtensionOrder([...DEFAULT_EXTENSION_ORDER]);
    }
}

function showPromptUpdateBanner(type, isAvailable) {
    const banner = document.getElementById(type + "UpdateBanner");
    if (!banner) return;
    if (isAvailable) {
        banner.style.display = "block";
    } else {
        banner.style.display = "none";
    }
}

function initializeSettingsPageUI() {
  const manifest = ext.runtime.getManifest();
  document.getElementById("appVersion").textContent = manifest.version;
  linkHelpTexts();
}

/**
 * Vincula cada .help-text al control del seu .form-group amb aria-describedby,
 * perquè el lector de pantalla llegeixi l'ajuda en enfocar el camp (abans no hi
 * havia cap aria-describedby a tota la pàgina).
 */
function linkHelpTexts() {
  document.querySelectorAll(".help-text").forEach((help, i) => {
    const group = help.parentElement;
    const control = group && group.querySelector("input:not([type=checkbox]):not([type=hidden]), select, textarea");
    if (!control) return;
    if (!help.id) help.id = `help-${control.id || i}`;
    const ids = (control.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (!ids.includes(help.id)) ids.push(help.id);
    control.setAttribute("aria-describedby", ids.join(" "));
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
    dismissPromptUpdate("deepdive");
}

function resetSciencePrompt() {
    document.querySelector("#sciencePrompt").value = DEFAULT_SCIENCE_PROMPT;
    dismissPromptUpdate("science");
}

function dismissPromptUpdate(type) {
    const banner = document.getElementById(type + "UpdateBanner");
    if (banner) banner.style.display = "none";
    const updateKey = type === "deepdive" ? "deepDivePromptUpdateAvailable"
        : type === "science" ? "sciencePromptUpdateAvailable"
        : type === "simple" ? "simplePromptUpdateAvailable"
        : "conceptMapPromptUpdateAvailable";
    ext.storage.sync.set({ [updateKey]: false }).catch(() => {});
}

function resetConceptMapPrompt() {
    document.querySelector("#conceptMapPrompt").value = DEFAULT_CONCEPTMAP_PROMPT;
    dismissPromptUpdate("conceptmap");
}

function resetSimplePrompt() {
    document.querySelector("#simplePrompt").value = DEFAULT_SIMPLE_PROMPT;
    dismissPromptUpdate("simple");
}

function resetAnkiPrompt() {
    document.querySelector("#ankiPrompt").value = DEFAULT_ANKI_PROMPT;
}

function resetBionic() {
    document.querySelector("#bionicFixation").value = String(DEFAULT_BIONIC.fixation);
    document.querySelector("#bionicFixationValue").textContent = DEFAULT_BIONIC.fixation + "%";
    document.querySelector("#bionicFont").value = DEFAULT_BIONIC.font;
    document.querySelector("#bionicWeight").value = DEFAULT_BIONIC.weight;
    document.querySelector("#bionicFontSize").value = DEFAULT_BIONIC.fontSize;
    document.querySelector("#bionicLineHeight").value = DEFAULT_BIONIC.lineHeight;
    showStatus("Valors de lectura biònica restaurats als valors per defecte.");
}

// #status és una regió role=status sempre present al DOM: quan no es mostra
// només s'amaga visualment (classe), perquè els lectors de pantalla anunciïn el
// canvi de text (amb display:none no s'anunciava res). El temporitzador es
// reinicia a cada missatge: abans el primer timeout amagava el segon missatge
// abans d'hora.
let statusTimer = null;
function showStatus(text) {
  const status = document.querySelector("#status");
  status.textContent = text;
  status.classList.add("show");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.classList.remove("show");
  }, 4000);
}
