// options/settings.js
// Punt d'entrada: event listeners i inicialització de la pàgina de configuració
// Les funcions estàn definides als mòduls settings-*.js carregats prèviament.

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
document.querySelector("#refreshModels").addEventListener("click", refreshModels);
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
