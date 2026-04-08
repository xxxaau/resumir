// options/settings.js
// Punt d'entrada: event listeners i inicialització de la pàgina de configuració
// Les funcions estàn definides als mòduls settings-*.js carregats prèviament.
// IMPORTANT: Tothom ha d'estar dins DOMContentLoaded!

document.addEventListener("DOMContentLoaded", async () => {
    // Restore saved options on page load and wait for completion
    await restoreOptions();
    
    // Initialize UI elements that depend on restored data
    if (typeof initializeSettingsPageUI === 'function') {
        initializeSettingsPageUI();
    }
    
    // Update sidebar with active plugins
    if (typeof updateSidebar === 'function') {
        updateSidebar();
    }
    
    // Update cache info and load statistics
    if (typeof updateCacheInfo === 'function') {
        updateCacheInfo();
    }
    if (typeof loadStatistics === 'function') {
        loadStatistics();
    }
    
    // Initialize sidebar navigation (needs to be after DOM is fully ready)
    if (typeof initializeSidebarNavigation === 'function') {
        initializeSidebarNavigation();
    }

    // Real-time fixation value update
    const bionicFixation = document.getElementById("bionicFixation");
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
    // Nota: només actualitza la UI de la barra lateral de configuració;
    // la persistència real es fa quan l'usuari prem un botó de "Desar" explícit.
    const extensionToggles = ["enableObsidian", "enableMarkdown", "enableDeepdive", "enableBionic", "enableScience"];
    extensionToggles.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('change', () => {
            updateSidebar();
        });
    });

    // Bind all save buttons to saveOptions
    const saveBtns = ["save", "saveCustom", "saveExtensions", "saveObsidian", "saveMarkdown", "saveDeepDive", "saveBionic", "saveScience"];
    saveBtns.forEach(id => {
        const btn = document.querySelector("#" + id);
        if(btn) btn.addEventListener("click", saveOptions);
    });

    // Reset buttons (with null checks)
    const resetTemplateBtn = document.querySelector("#resetTemplate");
    if (resetTemplateBtn) resetTemplateBtn.addEventListener("click", resetTemplate);
    
    const resetObsidianTemplateBtn = document.querySelector("#resetObsidianTemplate");
    if (resetObsidianTemplateBtn) resetObsidianTemplateBtn.addEventListener("click", resetObsidianTemplate);
    
    const resetSystemPromptBtn = document.querySelector("#resetSystemPrompt");
    if (resetSystemPromptBtn) resetSystemPromptBtn.addEventListener("click", resetSystemPrompt);
    
    const resetDeepDiveBtn = document.querySelector("#resetDeepDive");
    if (resetDeepDiveBtn) resetDeepDiveBtn.addEventListener("click", resetDeepDivePrompt);
    
    const resetScienceBtn = document.querySelector("#resetScience");
    if (resetScienceBtn) resetScienceBtn.addEventListener("click", resetSciencePrompt);
    
    // Model selection buttons
    const checkModels = document.querySelector("#checkModels");
    if (checkModels) checkModels.addEventListener("click", listModels);
    
    const refreshModelsBtn = document.querySelector("#refreshModels");
    if (refreshModelsBtn) refreshModelsBtn.addEventListener("click", refreshModels);

    // Cache and history buttons
    const clearHistoryBtn = document.getElementById("clearHistory");
    if (clearHistoryBtn) clearHistoryBtn.addEventListener("click", clearHistory);
    
    const clearCacheBtn = document.getElementById("clearCache");
    if (clearCacheBtn) clearCacheBtn.addEventListener("click", clearCache);

    // Pagination Event Listeners
    const prevPage = document.getElementById("prevPage");
    if (prevPage) {
        prevPage.addEventListener("click", () => {
            if (currentPage > 1) {
                currentPage--;
                loadStatistics();
            }
        });
    }

    const nextPage = document.getElementById("nextPage");
    if (nextPage) {
        nextPage.addEventListener("click", () => {
            if (currentPage < totalPages) {
                currentPage++;
                loadStatistics();
            }
        });
    }

    const pageSizeSelect = document.getElementById("pageSizeSelect");
    if (pageSizeSelect) {
        pageSizeSelect.addEventListener("change", (e) => {
            PAGE_SIZE = parseInt(e.target.value, 10);
            ext.storage.local.set({ pageSize: PAGE_SIZE });
            currentPage = 1;
            loadStatistics();
        });
    }

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

    // Period selector
    document.querySelectorAll(".period-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentPeriod = btn.dataset.period;
            document.querySelectorAll(".period-btn").forEach(b =>
                b.classList.toggle("active", b === btn)
            );
            currentPage = 1; // Reset paginació quan canvia el període
            loadStatistics();
        });
    });
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
