/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-options.js
// Gestió de les opcions: desar, restaurar, restablir defaults

// --- Options Management ---

// Botó «Desar» de cada pestanya de prompt → flag de l'avís de prompt nou que
// aquella pestanya mostra. Els altres botons no toquen cap flag.
const SAVE_BUTTON_UPDATE_KEYS = {
  saveCustom:     "systemPromptUpdateAvailable",
  saveAnki:       "ankiPromptUpdateAvailable",
  saveDeepDive:   "deepDivePromptUpdateAvailable",
  saveScience:    "sciencePromptUpdateAvailable",
  saveConceptMap: "conceptMapPromptUpdateAvailable",
  saveSimple:     "simplePromptUpdateAvailable",
};

// Camps de prompt i el seu valor per defecte (insígnia «Personalitzat» i
// bloqueig de prompt buit).
const PROMPT_FIELDS = [
  ["systemPrompt", () => DEFAULT_SYSTEM_PROMPT],
  ["deepDivePrompt", () => DEFAULT_DEEP_DIVE_PROMPT],
  ["sciencePrompt", () => DEFAULT_SCIENCE_PROMPT],
  ["conceptMapPrompt", () => DEFAULT_CONCEPTMAP_PROMPT],
  ["simplePrompt", () => DEFAULT_SIMPLE_PROMPT],
  ["ankiPrompt", () => DEFAULT_ANKI_PROMPT],
];

function updatePromptBadges() {
  for (const [id, getDefault] of PROMPT_FIELDS) {
    const el = document.querySelector("#" + id);
    const badge = document.querySelector(`#${id}Badge`);
    if (el && badge) badge.hidden = el.value === getDefault();
    // Personalitzat = no es pot perdre de vista: el bloc plegat s'obre (mai es tanca sol)
    const details = document.getElementById(id + "Details");
    if (details && badge && !badge.hidden) details.open = true;
  }
}

function saveOptions(e) {
  if(e) e.preventDefault();

  // Un prompt buit deixaria l'extensió sense instruccions: no es desa res.
  for (const [id] of PROMPT_FIELDS) {
    const el = document.querySelector("#" + id);
    if (el && !el.value.trim()) {
      const label = document.querySelector(`label[for="${id}"]`);
      const name = label ? label.textContent.replace(/\s+/g, " ").trim() : id;
      showStatus(`«${name}» no pot estar buit. Escriu-hi instruccions o prem «Restaurar».`);
      el.focus();
      return;
    }
  }
  
  // Sense espais, cometes ni prefix «Bearer» (errors habituals en enganxar-la)
  const apiKeyValue = normalizeApiKey(document.querySelector("#apiKey").value);
  const settings = {
    modelName: document.querySelector("#modelName").value,
    theme: document.querySelector("#themeSelect").value,
    systemPrompt: document.querySelector("#systemPrompt").value,
    systemPromptCustomized: document.querySelector("#systemPrompt").value !== DEFAULT_SYSTEM_PROMPT,
    youtubePreferredLangs: parseLangList(document.querySelector("#youtubePreferredLangs").value),
    summaryFormat: document.querySelector("#summaryFormat").value,
    summaryLength: document.querySelector("#summaryLength").value,

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
    // Casella marcada = «el mateix que Obsidian»: es desa buit i l'exportació cau al vault d'Obsidian
    ankiVault: document.querySelector("#ankiUseObsidianVault").checked ? "" : document.querySelector("#ankiVault").value,
    ankiPath: document.querySelector("#ankiPath").value || DEFAULT_ANKI_PATH,
    ankiPacket: parseInt(document.querySelector("#ankiPacket").value, 10) || DEFAULT_ANKI_PACKET,
    ankiLang: document.querySelector("#ankiLang").value || DEFAULT_ANKI_LANG,
    ankiPrompt: document.querySelector("#ankiPrompt").value,
    ankiPromptCustomized: document.querySelector("#ankiPrompt").value !== DEFAULT_ANKI_PROMPT,

    // Configura l'ordre de les extensions
    extensionOrder: getCurrentExtensionOrder(),

  };


  // Netejar NOMÉS el flag d'actualització de la pestanya que es desa (l'usuari
  // ja ha vist aquell avís). Abans es posaven els quatre a false en desar
  // qualsevol cosa (p. ex. el tema), amagant avisos que mai havia vist.
  const clearedUpdateKey = SAVE_BUTTON_UPDATE_KEYS[e && e.currentTarget && e.currentTarget.id];
  if (clearedUpdateKey) settings[clearedUpdateKey] = false;

  // Un prompt igual al default no es desa: així, quan el default canviï, l'usuari
  // que mai l'ha editat el rep sense quedar congelat amb el text antic.
  const defaultPromptKeys = [];
  for (const [id, getDefault] of PROMPT_FIELDS) {
    if (settings[id] !== undefined && settings[id] === getDefault()) {
      delete settings[id];
      defaultPromptKeys.push(id);
    }
  }

  Promise.all([
      ext.storage.sync.set(settings),
      ext.storage.local.set({ apiKey: apiKeyValue })
  ]).then(() => defaultPromptKeys.length ? ext.storage.sync.remove(defaultPromptKeys) : null).then(() => {
     setDirty(false);
     showStatus("Desat.");
     updateSidebar(); 
  }).catch(err => {
     console.error("Error saving options:", err);
     showStatus(describeSaveError(err, settings));
  });
}

// Quota per element de storage.sync (Chrome i Firefox): 8192 bytes per clau.
const SYNC_ITEM_QUOTA_BYTES = 8192;

// Id del camp (clau de settings) → id de l'element del formulari, per llegir-ne
// l'etiqueta visible. Les claus que no hi són coincideixen amb l'id.
function describeSaveError(err, settings) {
  const quota = /quota/i.test(String((err && err.message) || err));
  if (!quota) return "No s'ha pogut desar.";
  const enc = new TextEncoder();
  let worst = null;
  for (const [key, value] of Object.entries(settings)) {
    if (typeof value !== "string") continue;
    const bytes = enc.encode(key + JSON.stringify(value)).length;
    if (!worst || bytes > worst.bytes) worst = { key, bytes };
  }
  if (!worst) return "No s'ha pogut desar: configuració massa gran.";
  const label = document.querySelector(`label[for="${worst.key}"]`);
  const name = label ? label.textContent.replace(/\s+/g, " ").trim() : worst.key;
  const kb = (worst.bytes / 1024).toFixed(1).replace(".", ",");
  return `No s'ha pogut desar: «${name}» ocupa ${kb} KB i el màxim per camp és ${SYNC_ITEM_QUOTA_BYTES / 1024} KB. Escurça'l i torna a desar.`;
}

// --- Canvis sense desar ---
let dirty = false;
function setDirty(value) {
  dirty = value;
  const note = document.querySelector("#dirtyNote");
  if (note) note.hidden = !value;
}
function isDirty() { return dirty; }

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

/**
 * Vista prèvia de la ruta d'una nota amb la data d'ara («Exemple: …»). Els
 * tokens (gggg, ww…) no es descobreixen sense veure'n el resultat.
 */
function updatePathPreview(inputId, previewId, suffix = ".md") {
  const input = document.querySelector("#" + inputId);
  const preview = document.querySelector("#" + previewId);
  if (!input || !preview) return;
  const template = input.value || (inputId === "obsidianPath" ? DEFAULT_OBSIDIAN_PATH : DEFAULT_ANKI_PATH);
  let path;
  try {
    path = parseObsidianPath(template);
  } catch {
    preview.textContent = "";
    return;
  }
  if (suffix && !path.toLowerCase().endsWith(suffix)) path += suffix;
  preview.textContent = `Exemple: ${path}`;
}

/**
 * Valor d'un prompt desat, o el default si no n'hi ha cap o si és un default RETIRAT
 * (el literal que desaven versions antigues en prémer «Desar»): així la configuració
 * no el marca com a «Personalitzat» ni mostra un text que ningú ha escrit.
 */
function storedPrompt(syncData, key, defaultValue) {
    const v = syncData ? syncData[key] : undefined;
    if (v === undefined) return defaultValue;
    if (typeof v === "string" && (LEGACY_PROMPT_HASHES[key] || []).includes(promptHash(v))) return defaultValue;
    return v;
}

/** «ca, ES, xx-yy-zz» → ["ca", "es"]: minúscules (excepte la regió), sense buits ni codis invàlids. */
function parseLangList(text) {
  return String(text || "").split(",").map(t => t.trim()).filter(t => /^[A-Za-z]{2,3}(-[A-Za-z]{2,4})?$/.test(t))
    .map(t => { const [l, r] = t.split("-"); return r ? `${l.toLowerCase()}-${r.length === 2 ? r.toUpperCase() : r}` : l.toLowerCase(); });
}

function restoreOptions(syncData, localData) {
    document.querySelector("#apiKey").value = (localData && localData.apiKey) || "";
    document.querySelector("#modelName").placeholder = DEFAULT_MODEL_ID;
    document.querySelector("#obsidianPath").placeholder = DEFAULT_OBSIDIAN_PATH;
    document.querySelector("#ankiPath").placeholder = DEFAULT_ANKI_PATH;
    document.querySelector("#modelName").value = (syncData && syncData.modelName) || DEFAULT_MODEL_ID;
    updateModelSummary();
    document.querySelector("#themeSelect").value = (syncData && syncData.theme) || "system";
    document.querySelector("#systemPrompt").value = storedPrompt(syncData, "systemPrompt", DEFAULT_SYSTEM_PROMPT) || DEFAULT_SYSTEM_PROMPT;
    document.querySelector("#youtubePreferredLangs").value = Array.isArray(syncData && syncData.youtubePreferredLangs) ? syncData.youtubePreferredLangs.join(", ") : "";
    document.querySelector("#summaryFormat").value = (syncData && syncData.summaryFormat) || "default";
    document.querySelector("#summaryLength").value = (syncData && syncData.summaryLength) || "medium";

    document.querySelector("#enableMarkdown").checked = !(syncData && syncData.enableMarkdown === false);
    document.querySelector("#markdownTemplate").value = (syncData && syncData.markdownTemplate) || DEFAULT_MARKDOWN_TEMPLATE;

    document.querySelector("#enableObsidian").checked = syncData && syncData.enableObsidian === true;
    document.querySelector("#obsidianVault").value = (syncData && syncData.obsidianVault) || "Obsidian";
    document.querySelector("#obsidianPath").value = (syncData && syncData.obsidianPath) || DEFAULT_OBSIDIAN_PATH;
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
    document.querySelector("#deepDivePrompt").value = storedPrompt(syncData, "deepDivePrompt", DEFAULT_DEEP_DIVE_PROMPT);

    document.querySelector("#enableScience").checked = syncData ? syncData.enableScience === true : false;
    document.querySelector("#sciencePrompt").value = storedPrompt(syncData, "sciencePrompt", DEFAULT_SCIENCE_PROMPT);

    document.querySelector("#enableResum").checked = syncData ? syncData.enableResum !== false : true;
    document.querySelector("#enablePdf").checked = syncData ? syncData.enablePdf !== false : true;
    document.querySelector("#enableConceptMap").checked = syncData && syncData.enableConceptMap === true;
    document.querySelector("#conceptMapPrompt").value = storedPrompt(syncData, "conceptMapPrompt", DEFAULT_CONCEPTMAP_PROMPT);

    document.querySelector("#enableSimple").checked = syncData && syncData.enableSimple === true;
    document.querySelector("#simplePrompt").value = storedPrompt(syncData, "simplePrompt", DEFAULT_SIMPLE_PROMPT);

    document.querySelector("#enableAnki").checked = syncData ? syncData.enableAnki === true : false;
    // Vault independent: si encara no s'ha configurat per Anki, es pre-omple amb el
    // d'Obsidian (seed de primera càrrega). En desar es fixa i ja és independent.
    // «Mateix vault que Obsidian» si no n'hi ha cap de propi (buit/inexistent) o és el mateix
    const ankiOwn = (syncData && syncData.ankiVault) || "";
    const sameAsObsidian = !ankiOwn || ankiOwn === ((syncData && syncData.obsidianVault) || "Obsidian");
    document.querySelector("#ankiUseObsidianVault").checked = sameAsObsidian;
    document.querySelector("#ankiVault").value = sameAsObsidian ? "" : ankiOwn;
    toggleAnkiVaultField();
    document.querySelector("#ankiPath").value = (syncData && syncData.ankiPath) || DEFAULT_ANKI_PATH;
    document.querySelector("#ankiPacket").value = (syncData && syncData.ankiPacket) || DEFAULT_ANKI_PACKET;
    document.querySelector("#ankiLang").value = (syncData && syncData.ankiLang) || DEFAULT_ANKI_LANG;
    document.querySelector("#ankiPrompt").value = storedPrompt(syncData, "ankiPrompt", DEFAULT_ANKI_PROMPT);

    // Mostrar banners d'actualització de prompts si n'hi ha
    if (syncData) {
        showPromptUpdateBanner("system", syncData.systemPromptUpdateAvailable);
        showPromptUpdateBanner("anki", syncData.ankiPromptUpdateAvailable);
        showPromptUpdateBanner("deepdive", syncData.deepDivePromptUpdateAvailable);
        showPromptUpdateBanner("science", syncData.sciencePromptUpdateAvailable);
        showPromptUpdateBanner("conceptmap", syncData.conceptMapPromptUpdateAvailable);
        showPromptUpdateBanner("simple", syncData.simplePromptUpdateAvailable);
    }
    updateBionicPreview();

    if (syncData && syncData.extensionOrder && Array.isArray(syncData.extensionOrder)) {
        applyExtensionOrder(syncData.extensionOrder);
    } else {
        // Sense ordre desat: apliquem l'ordre per defecte perquè la llista (i el
        // que captura getCurrentExtensionOrder en desar) reflecteixi el default.
        applyExtensionOrder([...DEFAULT_EXTENSION_ORDER]);
    }
    updatePromptBadges();
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

/**
 * Restaura un camp de text al valor per defecte sense perdre el que hi havia:
 * el toast ofereix «Desfer». El canvi queda pendent de desar (no es persisteix).
 */
function restoreField(id, defaultValue, label) {
    const el = document.querySelector("#" + id);
    const previous = el.value;
    if (previous === defaultValue) {
        showStatus(`${label} ja és el valor per defecte.`);
        return false;
    }
    el.value = defaultValue;
    updatePromptBadges();
    setDirty(true);
    showStatus(`${label} restaurat al valor per defecte.`, {
        undo: () => { el.value = previous; updatePromptBadges(); setDirty(true); showStatus("Restauració desfeta."); },
    });
    return true;
}

function resetTemplate() {
    restoreField("markdownTemplate", DEFAULT_MARKDOWN_TEMPLATE, "La plantilla");
}

function resetObsidianTemplate() {
    restoreField("obsidianTemplate", DEFAULT_OBSIDIAN_TEMPLATE, "La plantilla");
}

function resetSystemPrompt() {
    restoreField("systemPrompt", DEFAULT_SYSTEM_PROMPT, "El prompt");
    hidePromptUpdateBanner("system");
}

function resetDeepDivePrompt() {
    restoreField("deepDivePrompt", DEFAULT_DEEP_DIVE_PROMPT, "El prompt");
    hidePromptUpdateBanner("deepdive");
}

function resetSciencePrompt() {
    restoreField("sciencePrompt", DEFAULT_SCIENCE_PROMPT, "El prompt");
    hidePromptUpdateBanner("science");
}

// «Restaurar» només amaga el bàner: el flag es descarta en DESAR (SAVE_BUTTON_UPDATE_KEYS) o en
// «Mantenir el meu prompt». Si es persistís aquí, un «Desfer» seguit de tancar sense desar deixaria
// el bàner descartat amb el prompt personalitzat intacte.
function hidePromptUpdateBanner(type) {
    const banner = document.getElementById(type + "UpdateBanner");
    if (banner) banner.style.display = "none";
}

function dismissPromptUpdate(type) {
    const banner = document.getElementById(type + "UpdateBanner");
    if (banner) banner.style.display = "none";
    const updateKey = type === "system" ? "systemPromptUpdateAvailable"
        : type === "anki" ? "ankiPromptUpdateAvailable"
        : type === "deepdive" ? "deepDivePromptUpdateAvailable"
        : type === "science" ? "sciencePromptUpdateAvailable"
        : type === "simple" ? "simplePromptUpdateAvailable"
        : "conceptMapPromptUpdateAvailable";
    ext.storage.sync.set({ [updateKey]: false }).catch(() => {});
}

// «Restaurar» des del bàner: torna el prompt al default i desa NOMÉS aquest prompt i el seu avís
// (abans clicava «Desar» de la pestanya i, de passada, es desava tot el que l'usuari tingués a mig editar).
const BANNER_PROMPT_KEYS = {
    system: ["systemPrompt", "systemPromptCustomized", "systemPromptUpdateAvailable"],
    anki: ["ankiPrompt", "ankiPromptCustomized", "ankiPromptUpdateAvailable"],
    deepdive: ["deepDivePrompt", "deepDivePromptCustomized", "deepDivePromptUpdateAvailable"],
    science: ["sciencePrompt", "sciencePromptCustomized", "sciencePromptUpdateAvailable"],
    conceptmap: ["conceptMapPrompt", "conceptMapPromptCustomized", "conceptMapPromptUpdateAvailable"],
    simple: ["simplePrompt", "simplePromptCustomized", "simplePromptUpdateAvailable"],
};
async function restorePromptFromBanner(type, reset) {
    const wasDirty = isDirty();
    reset();
    setDirty(wasDirty);
    const [promptKey, customizedKey, updateKey] = BANNER_PROMPT_KEYS[type];
    try {
        await ext.storage.sync.remove(promptKey);
        await ext.storage.sync.set({ [customizedKey]: false, [updateKey]: false });
        showStatus("Prompt restaurat al valor per defecte.");
    } catch (err) {
        console.error("Error restaurant el prompt:", err);
        showStatus("No s'ha pogut restaurar el prompt.");
    }
}

function resetConceptMapPrompt() {
    restoreField("conceptMapPrompt", DEFAULT_CONCEPTMAP_PROMPT, "El prompt");
    hidePromptUpdateBanner("conceptmap");
}

function resetSimplePrompt() {
    restoreField("simplePrompt", DEFAULT_SIMPLE_PROMPT, "El prompt");
    hidePromptUpdateBanner("simple");
}

function resetAnkiPrompt() {
    restoreField("ankiPrompt", DEFAULT_ANKI_PROMPT, "El prompt");
    hidePromptUpdateBanner("anki");
}

const BIONIC_PREVIEW_TEXT = "La lectura biònica ressalta l'inici de cada paraula perquè els ulls avancin amb més fluïdesa pel text.";

/** Pinta la mostra amb els cinc valors actuals (mateixa regla que formatBionicText de la barra lateral). */
/** Mostra el camp del vault propi només si la casella «mateix vault que Obsidian» està desmarcada. */
function toggleAnkiVaultField() {
  const box = document.querySelector("#ankiUseObsidianVault");
  const field = document.querySelector("#ankiVaultField");
  if (box && field) field.hidden = box.checked;
}

function updateBionicPreview() {
    const el = document.querySelector("#bionicPreview");
    if (!el) return;
    const fixation = (parseInt(document.querySelector("#bionicFixation").value, 10) || DEFAULT_BIONIC.fixation) / 100;
    el.replaceChildren();
    for (const part of BIONIC_PREVIEW_TEXT.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) { el.appendChild(document.createTextNode(part)); continue; }
        const boldLen = part.length > 3 ? Math.ceil(part.length * fixation) : 1;
        const b = document.createElement("b");
        b.textContent = part.slice(0, boldLen);
        el.appendChild(b);
        el.appendChild(document.createTextNode(part.slice(boldLen)));
    }
    el.style.fontFamily = document.querySelector("#bionicFont").value;
    el.style.fontSize = (14 * (parseFloat(document.querySelector("#bionicFontSize").value) || 1)) + "px";
    el.style.lineHeight = document.querySelector("#bionicLineHeight").value;
    el.style.setProperty("--bionic-weight", document.querySelector("#bionicWeight").value);
}

function resetBionic() {
    const ids = ["bionicFixation", "bionicFont", "bionicWeight", "bionicFontSize", "bionicLineHeight"];
    const previous = Object.fromEntries(ids.map(id => [id, document.querySelector("#" + id).value]));
    document.querySelector("#bionicFixation").value = String(DEFAULT_BIONIC.fixation);
    document.querySelector("#bionicFixationValue").textContent = DEFAULT_BIONIC.fixation + "%";
    document.querySelector("#bionicFont").value = DEFAULT_BIONIC.font;
    document.querySelector("#bionicWeight").value = DEFAULT_BIONIC.weight;
    document.querySelector("#bionicFontSize").value = DEFAULT_BIONIC.fontSize;
    document.querySelector("#bionicLineHeight").value = DEFAULT_BIONIC.lineHeight;
    updateBionicPreview();
    setDirty(true);
    showStatus("Valors de lectura biònica restaurats als valors per defecte.", {
        undo: () => {
            for (const id of ids) document.querySelector("#" + id).value = previous[id];
            document.querySelector("#bionicFixationValue").textContent = previous.bionicFixation + "%";
            updateBionicPreview();
            setDirty(true);
            showStatus("Restauració desfeta.");
        },
    });
}

// #status és una regió role=status sempre present al DOM: quan no es mostra
// només s'amaga visualment (classe), perquè els lectors de pantalla anunciïn el
// canvi de text (amb display:none no s'anunciava res). El temporitzador es
// reinicia a cada missatge: abans el primer timeout amagava el segon missatge
// abans d'hora.
let statusTimer = null;
function showStatus(text, { undo } = {}) {
  const status = document.querySelector("#status");
  status.textContent = text;
  if (undo) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "toast-action";
    btn.textContent = "Desfer";
    btn.addEventListener("click", undo);
    status.appendChild(btn);
  }
  status.classList.add("show");
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    status.classList.remove("show");
  }, undo ? 10000 : 4000);
}
