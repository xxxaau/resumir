/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-models.js
// Selecció de models i gestió de favorits
// CURATED_MODELS ve de shared/models.js (carregat abans d'aquest fitxer)

/**
 * Renderitza la llista de models amb estrelles de favortit.
 * No fa cap crida a l'API — només llegeix la cache local.
 */
// Tancar el selector si es clica fora
document.addEventListener("click", (e) => {
    const modelsList = document.querySelector("#modelsList");
    if (modelsList && modelsList.style.display === "block") {
        const isInsideList = modelsList.contains(e.target);
        const isSelectBtn = e.target.closest("#checkModels");
        const isRefreshBtn = e.target.closest("#refreshModels");
        if (!isInsideList && !isSelectBtn && !isRefreshBtn) {
            modelsList.style.display = "none";
        }
    }
});

async function listModels(e) {
    e.preventDefault();
    const modelsList = document.querySelector("#modelsList");

    // Toggle: si ja està visible, amaga'l
    if (modelsList.style.display === "block") {
        modelsList.style.display = "none";
        return;
    }

    modelsList.style.display = "block";
    modelsList.replaceChildren();

    // Carregar la cache de models i els favorits de l'usuari
    const [localData, favoriteIds] = await Promise.all([
        ext.storage.local.get(["availableModels", "availableModelsUpdated"]),
        ensureFavoriteModels()
    ]);
    const currentModel = document.querySelector("#modelName").value;
    let allModels;

    if (localData.availableModels && localData.availableModels.length > 0) {
        allModels = localData.availableModels;

        // Mostrar data de l'última actualització
        if (localData.availableModelsUpdated) {
            const dateStr = new Date(localData.availableModelsUpdated).toLocaleDateString("ca-ES", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
            });
            const infoDiv = document.createElement("div");
            infoDiv.className = "models-list-info";
            infoDiv.textContent = `Última actualització: ${dateStr}`;
            modelsList.appendChild(infoDiv);
        }
    } else {
        // Sense cache: mostrar els curats per defecte
        allModels = CURATED_MODELS.map(cm => ({ id: cm.id, label: cm.label, curated: true }));

        const hintDiv = document.createElement("div");
        hintDiv.className = "models-list-info";
        hintDiv.style.fontStyle = "italic";
        hintDiv.textContent = 'Prem "Actualitzar" per descarregar tots els models disponibles.';
        modelsList.appendChild(hintDiv);
    }

    renderModelList(allModels, favoriteIds, currentModel, modelsList);
}

/**
 * Renderitza models separats en favorits / resta, amb estrelles clicables.
 */
function renderModelList(allModels, favoriteIds, currentModel, container) {
    // Netejar només les files de models (preservar info divs)
    container.querySelectorAll(".models-section-title, .model-item-row").forEach(el => el.remove());

    const favorites = sortModelsByPriority(allModels.filter(m => favoriteIds.includes(m.id)));
    const others    = sortModelsByPriority(allModels.filter(m => !favoriteIds.includes(m.id)));

    if (favorites.length > 0) {
        const title = document.createElement("div");
        title.className = "models-section-title";
        title.textContent = "★ Els meus models";
        container.appendChild(title);
        favorites.forEach(m => container.appendChild(
            createModelRow(m, true, currentModel, favoriteIds, allModels, container)
        ));
    }

    if (others.length > 0) {
        const title = document.createElement("div");
        title.className = "models-section-title";
        title.textContent = "Altres models disponibles";
        container.appendChild(title);
        others.forEach(m => container.appendChild(
            createModelRow(m, false, currentModel, favoriteIds, allModels, container)
        ));
    }
}

/**
 * Crea una fila: ★ estrella | nom del model (clic per seleccionar)
 */
function createModelRow(model, isFavorite, currentModel, favoriteIds, allModels, container) {
    const row = document.createElement("div");
    row.className = "model-item-row";

    // Estrella
    const star = document.createElement("span");
    star.className = "model-star" + (isFavorite ? " active" : "");
    star.textContent = "★";
    star.title = isFavorite ? "Treure dels favorits" : "Afegir als favorits";
    star.addEventListener("click", async (e) => {
        e.stopPropagation();
        const idx = favoriteIds.indexOf(model.id);
        if (idx >= 0) favoriteIds.splice(idx, 1);
        else favoriteIds.push(model.id);
        await ext.storage.sync.set({ favoriteModels: [...favoriteIds] });
        renderModelList(allModels, favoriteIds, currentModel, container);
    });

    // Nom
    const nameBtn = document.createElement("span");
    nameBtn.className = "model-name-btn";
    nameBtn.textContent = model.label || model.id;
    if (model.id === currentModel) nameBtn.classList.add("selected");
    nameBtn.addEventListener("click", () => {
        document.querySelector("#modelName").value = model.id;
        container.style.display = "none";
    });

    row.appendChild(star);
    row.appendChild(nameBtn);
    return row;
}

/**
 * Consulta l'API de Google, actualitza la cache local i re-renderitza.
 */
async function refreshModels(e) {
    e.preventDefault();
    const apiKey = document.querySelector("#apiKey").value;
    const btn = document.querySelector("#refreshModels");
    const statusDiv = document.getElementById("refreshModelsStatus");

    if (!apiKey) {
        alert("Primer introdueix la API Key per actualitzar els models.");
        return;
    }

    btn.textContent = "Actualitzant...";
    btn.disabled = true;
    statusDiv.style.display = "none";

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models`, {
            headers: { "x-goog-api-key": apiKey }
        });
        if (!response.ok) {
            const err = await response.json();
            throw new Error(`[011] ${err.error?.message || response.statusText}`);
        }
        const data = await response.json();

        const curatedIds = new Set(CURATED_MODELS.map(m => m.id));
        const apiModels = (data.models || [])
            .filter(m =>
                m.supportedGenerationMethods?.includes("generateContent") &&
                !/embedding|aqa|robotics|vision|image/i.test(m.name)
            )
            .map(m => ({
                id: m.name.replace("models/", ""),
                label: m.displayName || m.name.replace("models/", "")
            }))
            .filter(m => !curatedIds.has(m.id));

        const mergedModels = sortModelsByPriority([
            ...CURATED_MODELS.map(cm => ({ id: cm.id, label: cm.label, curated: true })),
            ...apiModels.map(m => ({ id: m.id, label: m.label, curated: false }))
        ]);

        await ext.storage.local.set({
            availableModels: mergedModels,
            availableModelsUpdated: Date.now()
        });

        // Eliminar dels favorits els models que ja no existeixen a l'API
        const validIds = new Set(mergedModels.map(m => m.id));
        const syncData = await ext.storage.sync.get({ favoriteModels: [] });
        const currentFavorites = syncData.favoriteModels || [];
        const cleanedFavorites = currentFavorites.filter(id => validIds.has(id));
        if (cleanedFavorites.length !== currentFavorites.length) {
            if (!cleanedFavorites.includes(DEFAULT_MODEL_ID) && validIds.has(DEFAULT_MODEL_ID)) {
                cleanedFavorites.unshift(DEFAULT_MODEL_ID);
            }
            await ext.storage.sync.set({ favoriteModels: cleanedFavorites });
        }
        const removedCount = currentFavorites.length - cleanedFavorites.length;

        statusDiv.style.display = "block";
        statusDiv.style.color = "var(--success-color, #28a745)";
        statusDiv.textContent = `✓ ${mergedModels.length} models disponibles (${CURATED_MODELS.length} recomanats + ${apiModels.length} addicionals)`
            + (removedCount > 0 ? ` · ${removedCount} favorit${removedCount > 1 ? "s" : ""} eliminat${removedCount > 1 ? "s" : ""} per obsolets` : "");

        // Si el panell de selecció està obert, actualitza'l
        const modelsList = document.querySelector("#modelsList");
        if (modelsList.style.display === "block") {
            const currentModel = document.querySelector("#modelName").value;
            modelsList.querySelectorAll(".models-list-info").forEach(el => el.remove());
            const dateStr = new Date().toLocaleDateString("ca-ES", {
                day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
            });
            const infoDiv = document.createElement("div");
            infoDiv.className = "models-list-info";
            infoDiv.textContent = `Última actualització: ${dateStr}`;
            modelsList.prepend(infoDiv);
            renderModelList(mergedModels, cleanedFavorites, currentModel, modelsList);
        }

    } catch (err) {
        statusDiv.style.display = "block";
        statusDiv.style.color = "var(--error-color, #dc3545)";
        statusDiv.textContent = `✗ Error: ${err.message}`;
    } finally {
        btn.textContent = "Actualitzar";
        btn.disabled = false;
    }
}
