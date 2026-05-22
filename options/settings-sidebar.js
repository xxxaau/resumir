/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-sidebar.js
// Navegació per pestanyes i actualització de la barra lateral de configuració

// --- Navigation Logic ---

// Initialize sidebar navigation and event delegation
function initializeSidebarNavigation() {
    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) {
        console.error('Sidebar element not found');
        return;
    }

    sidebar.addEventListener('click', (e) => {
        // Get the actual clicked element
        let target = e.target;
        
        // If clicked on SVG or text inside, traverse up
        if (target.tagName === 'svg' || target.tagName === 'SVG') {
            target = target.closest('button.nav-item');
        } else if (target.tagName !== 'BUTTON') {
            // If it's text or other element, traverse up to button
            const btn = target.closest('button.nav-item');
            if (btn) target = btn;
        }
        
        // Check if we're on a nav-item button
        if (!target || !target.classList.contains('nav-item')) return;

        // Remove active class from all
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));

        // Add to current
        target.classList.add('active');
        const tabId = target.getAttribute('data-tab');
        const tab = document.getElementById(`tab-${tabId}`);
        if (tab) {
            tab.classList.add('active');
        }
    });
}

// Navigate to tab helper
function navigateToTab(tabId) {
    // Find nav item (might be dynamic)
    const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    
    // Simulate click if exists, otherwise manually switch
    if (navItem) {
        navItem.click();
    } else {
        // Fallback for sub-tabs not in sidebar (shouldn't happen with new design, but safety)
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
        const tab = document.getElementById(`tab-${tabId}`);
        if (tab) tab.classList.add('active');
    }
}

// --- Dynamic Sidebar Logic ---
function updateSidebar() {
    const list = document.getElementById("activeExtensionsList");
    const header = document.getElementById("activeExtensionsHeader");
    list.replaceChildren(); // Clear

    const extensions = [
        { id: "resum", label: "Resum", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>' },
        { id: "obsidian", label: "Obsidian", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>' },
        { id: "markdown", label: "Markdown", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V7l4 5 4-5v10"/><path d="M15 7h2a5 5 0 0 1 0 10h-2V7z"/></svg>' },
        { id: "deepdive", label: "Aprofundiment", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v16m8-8H4"/></svg>' },
        { id: "bionic", label: "Lectura biònica", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' },
        { id: "science", label: "Validació científica", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-4.734 7.1A4 4 0 0 0 7 20h10a4 4 0 0 0 3.406-6.102l-4.734-7.1A4 4 0 0 1 15 4.789V2"/><path d="M9 2h6"/><path d="M14 15h-4"/><path d="M16 11h-4"/></svg>' },
        { id: "conceptmap", label: "Mapa conceptual", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M12 9V5" /><path d="M12 12l-7 5" /><path d="M12 12l7 5" /><path d="M12 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M19 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></svg>' }
    ];

    const currentOrder = getCurrentExtensionOrder();
    extensions.sort((a, b) => {
        const indexA = currentOrder.indexOf(a.id);
        const indexB = currentOrder.indexOf(b.id);
        const posA = indexA === -1 ? 999 : indexA;
        const posB = indexB === -1 ? 999 : indexB;
        return posA - posB;
    });

    let count = 0;
    extensions.forEach(ext => {
        // Build checkbox ID: resum → enableResum, conceptmap → enableConceptMap, etc.
        let checkboxId;
        if (ext.id === "resum") {
            checkboxId = "enableResum";
        } else if (ext.id === "conceptmap") {
            checkboxId = "enableConceptMap";
        } else {
            checkboxId = "enable" + ext.id.charAt(0).toUpperCase() + ext.id.slice(1);
        }
        
        const checkbox = document.getElementById(checkboxId);
        
        if (checkbox && checkbox.checked) {
            count++;
            const btn = document.createElement("button");
            btn.className = "nav-item dynamic-extension";
            btn.setAttribute("data-tab", ext.id);

            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(ext.icon, "image/svg+xml");
            const svgEl = svgDoc.documentElement;
            if (ext.color) {
                svgEl.style.color = ext.color;
            }
            btn.appendChild(svgEl);
            btn.appendChild(document.createTextNode(ext.label));
            
            if (document.getElementById(`tab-${ext.id}`)?.classList.contains('active')) {
                btn.classList.add('active');
            }

            list.appendChild(btn);
        }
    });

    if (count > 0) {
        header.style.display = "block";
    } else {
        header.style.display = "none";
    }
}
