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

    // Re-append items in order
    order.forEach(id => {
        const item = itemsMap.get(id);
        if (item) {
            list.appendChild(item); // Moves it to the end (reordering)
            itemsMap.delete(id);
        }
    });

    // Append any remaining items (new ones?)
    itemsMap.forEach(item => {
        list.appendChild(item);
    });

    updateMoveButtonsState();
}

function moveExtension(extensionId, direction) {
    const list = document.querySelector(".extensions-list");
    const actions = list.querySelector(`.extension-actions[data-extension-id="${extensionId}"]`);
    if (!actions) return;
    const item = actions.closest(".extension-item");
    if (!item) return;

    if (direction === "up") {
        const prev = item.previousElementSibling;
        if (prev) {
            list.insertBefore(item, prev);
        }
    } else if (direction === "down") {
        const next = item.nextElementSibling;
        if (next) {
            list.insertBefore(next, item);
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
    const items = Array.from(list.querySelectorAll(".extension-item"));
    const nameEl = item.querySelector(".extension-name");
    const name = nameEl ? (nameEl.childNodes[0] ? nameEl.childNodes[0].textContent.trim() : nameEl.textContent.trim()) : extensionId;
    // Regió pròpia (no el toast): l'autodesat hi escriu «Desat» just després i trepitjaria l'avís
    const live = document.getElementById("reorderStatus");
    if (live) live.textContent = `${name}: posició ${items.indexOf(item) + 1} de ${items.length}.`;
}

function updateMoveButtonsState() {
    const list = document.querySelector(".extensions-list");
    const items = list.querySelectorAll(".extension-item");
    
    items.forEach((item, index) => {
        const upBtn = item.querySelector(".btn-move-up");
        const downBtn = item.querySelector(".btn-move-down");
        
        if (upBtn) upBtn.disabled = (index === 0);
        if (downBtn) downBtn.disabled = (index === items.length - 1);
    });
}
