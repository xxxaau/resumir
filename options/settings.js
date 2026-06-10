/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings.js
// Punt d'entrada: event listeners i inicialització de la pàgina de configuració
// Les funcions estàn definides als mòduls settings-*.js carregats prèviament.
// IMPORTANT: Tothom ha d'estar dins DOMContentLoaded!

document.addEventListener("DOMContentLoaded", async () => {
    // Single batch — read all settings once (elimina 3 lectures storage redundants)
    const ALL_CONFIG_KEYS = [
        "modelName", "theme", "systemPrompt",
        "enableMarkdown", "markdownTemplate", "enableObsidian", "obsidianVault",
        "obsidianPath", "obsidianTemplate", "enableBionic", "bionicFixation",
        "bionicFont", "bionicWeight", "bionicFontSize", "bionicLineHeight",
        "enableDeepdive", "deepDivePrompt", "deepDivePromptCustomized", "deepDivePromptUpdateAvailable",
        "enableScience", "sciencePrompt", "sciencePromptCustomized", "sciencePromptUpdateAvailable",
        "enableResum", "enableConceptMap", "conceptMapPrompt", "conceptMapPromptCustomized", "conceptMapPromptUpdateAvailable",
        "enableSimple", "simplePrompt", "simplePromptCustomized", "simplePromptUpdateAvailable",
        "extensionOrder", "promptDefaultsVersion"
    ];
    const [localData, syncData] = await Promise.all([
        ext.storage.local.get(["apiKey"]),
        ext.storage.sync.get(ALL_CONFIG_KEYS)
    ]);

    // Populate all fields from single batch
    restoreOptions(syncData, localData);
    if (typeof updateSidebar === 'function') updateSidebar();
    if (typeof initializeSidebarNavigation === 'function') initializeSidebarNavigation();
    if (typeof initializeSettingsPageUI === 'function') initializeSettingsPageUI();

    // Bind event listeners
    const getEl = id => document.getElementById(id);
    const bindClick = (id, handler) => {
        const el = getEl(id);
        if (el) el.addEventListener('click', handler);
    };
    // Real-time fixation value update
    const bionicFixation = getEl("bionicFixation");
    if (bionicFixation) {
        bionicFixation.addEventListener("input", (e) => {
            const valueEl = document.getElementById("bionicFixationValue");
            if (valueEl) valueEl.textContent = e.target.value + "%";
        });
    }

    // Handle "Configure" buttons in extension list
    document.querySelectorAll('.btn-icon[data-target]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            navigateToTab(target);
        });
    });

    // Handle "Live" Toggles in extension list
    const extensionToggles = ["enableResum", "enableObsidian", "enableMarkdown", "enableDeepdive", "enableBionic", "enableScience", "enableConceptMap", "enableSimple"];
    extensionToggles.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            updateSidebar();
        });
    });

    // Bind all save buttons to saveOptions
    ["save", "saveCustom", "saveExtensions", "saveObsidian", "saveMarkdown", "saveDeepDive", "saveBionic", "saveScience", "saveConceptMap", "saveSimple"].forEach(id => {
        bindClick(id, saveOptions);
    });

    // Reset buttons
    bindClick("resetTemplate", resetTemplate);
    bindClick("resetObsidianTemplate", resetObsidianTemplate);
    bindClick("resetSystemPrompt", resetSystemPrompt);
    bindClick("resetDeepDive", resetDeepDivePrompt);
    bindClick("resetScience", resetSciencePrompt);
    bindClick("resetConceptMap", resetConceptMapPrompt);
    bindClick("resetSimple", resetSimplePrompt);
    bindClick("resetBionic", resetBionic);

    // Model selection buttons
    bindClick("checkModels", listModels);
    bindClick("refreshModels", refreshModels);

    // Cache buttons
    bindClick("clearCache", clearCache);

    // Reordering Event Delegation
    const extensionsList = document.querySelector(".extensions-list");
    if (extensionsList) {
        extensionsList.addEventListener("click", (e) => {
            const btn = e.target.closest(".btn-move-up, .btn-move-down");
            if (!btn) return;

            const actionDiv = btn.closest(".extension-actions");
            const id = actionDiv.getAttribute("data-extension-id");
            const direction = btn.classList.contains("btn-move-up") ? "up" : "down";

            moveExtension(id, direction);
        });
    }

    // --- About Links (CSP Safe) ---
    const btnGithub = document.getElementById("btnGithub");
    if (btnGithub) {
        btnGithub.addEventListener("click", () => {
            window.open("https://github.com/xxxaau/extensio-resumir-contingut", "_blank");
        });
    }

    const btnIssues = document.getElementById("btnIssues");
    if (btnIssues) {
        btnIssues.addEventListener("click", () => {
            window.open("https://github.com/xxxaau/extensio-resumir-contingut/issues", "_blank");
        });
    }

    const linkAuthor = document.getElementById("linkAuthor");
    if (linkAuthor) {
        linkAuthor.addEventListener("click", (e) => {
            e.preventDefault();
            window.open("https://sergi.xaudiera.xyz", "_blank");
        });
    }

});

// Sync model selection with sidebar changes in real-time
// This runs outside DOMContentLoaded because ext.storage.onChanged is a global listener
ext.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.modelName && changes.modelName.newValue) {
        const modelEl = document.querySelector("#modelName");
        if (modelEl && modelEl.value !== changes.modelName.newValue) {
            modelEl.value = changes.modelName.newValue;
        }
    }
});
