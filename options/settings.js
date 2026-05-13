/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

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

    const getEl = id => document.getElementById(id);
    const bindClick = (id, handler) => {
        const el = getEl(id);
        if (el) el.addEventListener('click', handler);
    };
    const bindChange = (id, handler) => {
        const el = getEl(id);
        if (el) el.addEventListener('change', handler);
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
    ["save", "saveCustom", "saveExtensions", "saveObsidian", "saveMarkdown", "saveDeepDive", "saveBionic", "saveScience"].forEach(id => {
        bindClick(id, saveOptions);
    });

    // Reset buttons (with null checks)
    bindClick("resetTemplate", resetTemplate);
    bindClick("resetObsidianTemplate", resetObsidianTemplate);
    bindClick("resetSystemPrompt", resetSystemPrompt);
    bindClick("resetDeepDive", resetDeepDivePrompt);
    bindClick("resetScience", resetSciencePrompt);

    // Model selection buttons
    bindClick("checkModels", listModels);
    bindClick("refreshModels", refreshModels);

    // Cache and history buttons
    bindClick("clearHistory", clearHistory);
    bindClick("clearCache", clearCache);

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

    // Pagination for grouped table
    const groupedPrevPage = document.getElementById("groupedPrevPage");
    if (groupedPrevPage) {
        groupedPrevPage.addEventListener("click", () => {
            if (groupedCurrentPage > 1) {
                groupedCurrentPage--;
                renderGroupedPage();
            }
        });
    }

    const groupedNextPage = document.getElementById("groupedNextPage");
    if (groupedNextPage) {
        groupedNextPage.addEventListener("click", () => {
            if (groupedCurrentPage < groupedTotalPages) {
                groupedCurrentPage++;
                renderGroupedPage();
            }
        });
    }

    bindChange("pageSizeSelect", (e) => {
        const selected = parseInt(e.target.value, 10);
        if (Number.isInteger(selected) && selected > 0) {
            PAGE_SIZE = selected;
            ext.storage.local.set({ pageSize: PAGE_SIZE });
            currentPage = 1;
            loadStatistics();
        }
    });

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
