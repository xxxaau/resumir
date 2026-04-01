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
        order = ["resum", "science", "deepdive", "bionic", "obsidian", "markdown"];
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
    const item = list.querySelector(`.extension-actions[data-extension-id="${extensionId}"]`).closest(".extension-item");
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
