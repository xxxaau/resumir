/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-order.js
// Reordenació de les extensions a la barra lateral
// --- Reordering Logic ---

function getCurrentExtensionOrder() {
    const list = document.querySelector(".extensions-list");
    const items = Array.from(list.querySelectorAll(".extension-item"));
    return items.map(item => {
        const actionDiv = item.querySelector(".extension-actions");
        return actionDiv ? actionDiv.getAttribute("data-extension-id") : null;
    }).filter(id => id !== null);
}

/** Un bloc amb títol per cada grup de la barra d'eines (Generar | Exportar | Vista). */
function ensureGroupBoxes(list) {
    const boxes = {};
    for (const g of PLUGIN_GROUPS) {
        let box = list.querySelector(`.extension-group[data-group="${g}"]`);
        if (!box) {
            const title = document.createElement("h2");
            title.className = "extension-group-title";
            title.id = `extgroup-${g}`;
            title.textContent = g;
            box = document.createElement("div");
            box.className = "extension-group";
            box.dataset.group = g;
            box.setAttribute("role", "group");
            box.setAttribute("aria-labelledby", title.id);
            list.append(title, box);
        }
        boxes[g] = box;
    }
    return boxes;
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
        order = [...DEFAULT_EXTENSION_ORDER];
        ext.storage.sync.set({ extensionOrder: order });
    }

    const list = document.querySelector(".extensions-list");
    const items = Array.from(list.querySelectorAll(".extension-item"));
    const itemsMap = new Map();

    items.forEach(item => {
        const id = item.querySelector(".extension-actions").getAttribute("data-extension-id");
        if (id) itemsMap.set(id, item);
    });

    const boxes = ensureGroupBoxes(list);
    const place = (id, item) => {
        const entry = PLUGIN_REGISTRY.find(p => p.id === id);
        boxes[entry ? entry.group : PLUGIN_GROUPS[0]].appendChild(item);
    };

    // L'ordre desat es respecta DINS de cada grup (els grups són els de la barra d'eines)
    order.forEach(id => {
        const item = itemsMap.get(id);
        if (item) {
            place(id, item);
            itemsMap.delete(id);
        }
    });

    // Plugins que l'ordre desat no coneix (nous): al final del seu grup
    itemsMap.forEach((item, id) => place(id, item));

    updateMoveButtonsState();
}

function moveExtension(extensionId, direction) {
    const list = document.querySelector(".extensions-list");
    const actions = list.querySelector(`.extension-actions[data-extension-id="${extensionId}"]`);
    if (!actions) return;
    const item = actions.closest(".extension-item");
    if (!item) return;

    // Només es mou dins del seu grup: la barra d'eines els té fixos (Generar | Exportar | Vista)
    const box = item.parentElement;
    if (direction === "up") {
        const prev = item.previousElementSibling;
        if (prev) {
            box.insertBefore(item, prev);
        }
    } else if (direction === "down") {
        const next = item.nextElementSibling;
        if (next) {
            box.insertBefore(next, item);
        }
    }

    updateMoveButtonsState();
    updateSidebar();
    autosave({ extensionOrder: getCurrentExtensionOrder() });

    // Moure l'element (insertBefore) fa perdre el focus al botó premut, i un botó que
    // s'inhabilita a l'extrem també: es retorna el focus al botó (o al contrari si ja no es pot
    // moure més en aquella direcció) i s'anuncia la nova posició.
    const upBtn = item.querySelector(".btn-move-up");
    const downBtn = item.querySelector(".btn-move-down");
    const pressed = direction === "up" ? upBtn : downBtn;
    const target = pressed && !pressed.disabled ? pressed : (direction === "up" ? downBtn : upBtn);
    if (target && typeof target.focus === "function") target.focus();
    const items = Array.from(box.querySelectorAll(".extension-item"));
    const nameEl = item.querySelector(".extension-name");
    const name = nameEl ? (nameEl.childNodes[0] ? nameEl.childNodes[0].textContent.trim() : nameEl.textContent.trim()) : extensionId;
    // Regió pròpia (no el toast): l'autodesat hi escriu «Desat» just després i trepitjaria l'avís
    const live = document.getElementById("reorderStatus");
    if (live) live.textContent = `${name}: posició ${items.indexOf(item) + 1} de ${items.length} a ${box.dataset.group || "la llista"}.`;
}

function updateMoveButtonsState() {
    const list = document.querySelector(".extensions-list");
    // Els límits són els del grup, no els de tota la llista
    const groups = list.querySelectorAll(".extension-group");
    (groups.length ? Array.from(groups) : [list]).forEach(box => {
        const items = box.querySelectorAll(".extension-item");
        items.forEach((item, index) => {
            const upBtn = item.querySelector(".btn-move-up");
            const downBtn = item.querySelector(".btn-move-down");
            if (upBtn) upBtn.disabled = (index === 0);
            if (downBtn) downBtn.disabled = (index === items.length - 1);
        });
    });
}
