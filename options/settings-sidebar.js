/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// options/settings-sidebar.js
// Navegació per pestanyes i actualització de la barra lateral de configuració

// --- Navigation Logic ---

// Initialize sidebar navigation and event delegation
function initializeSidebarNavigation() {
    initializePluginHeaders();
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
        document.querySelectorAll('.nav-item').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));

        // Add to current
        target.classList.add('active');
        target.setAttribute('aria-current', 'page');
        const tabId = target.getAttribute('data-tab');
        const tab = document.getElementById(`tab-${tabId}`);
        if (tab) {
            tab.classList.add('active');
        }
        // La pestanya queda a l'adreça: recarregar o compartir l'enllaç hi torna
        if (tabId && window.history && window.history.replaceState) {
            window.history.replaceState(null, "", `#tab=${encodeURIComponent(tabId)}`);
        }
    });
}

// Pàgina de cada plugin → interruptor que governa la seva targeta
const PLUGIN_PANES = {
    resum: "enableResum", selectpdf: "enablePdf", obsidian: "enableObsidian", markdown: "enableMarkdown",
    deepdive: "enableDeepdive", science: "enableScience", bionic: "enableBionic",
    conceptmap: "enableConceptMap", simple: "enableSimple", anki: "enableAnki",
};

// Capçalera comuna de les pàgines de plugin: «← Plugins», estat i interruptor
// (lligat al de la targeta, que és el que es desa). Així un plugin desactivat
// no deixa l'usuari sense camí de tornada ni sense manera d'activar-lo.
function initializePluginHeaders() {
    for (const [pane, enableId] of Object.entries(PLUGIN_PANES)) {
        const tab = document.getElementById(`tab-${pane}`);
        const source = document.getElementById(enableId);
        if (!tab || !source || tab.querySelector('.plugin-head')) continue;

        const head = document.createElement('div');
        head.className = 'plugin-head';
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'plugin-back';
        back.textContent = '← Plugins';
        back.addEventListener('click', () => navigateToTab('extensions'));

        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.setAttribute('aria-label', 'Activa aquest plugin');
        const slider = document.createElement('span');
        slider.className = 'slider round';
        switchLabel.append(toggle, slider);
        const state = document.createElement('span');
        state.className = 'plugin-state';

        const sync = () => {
            toggle.checked = source.checked;
            state.textContent = source.checked ? 'Actiu' : 'Inactiu';
        };
        sync();
        source.addEventListener('change', sync);
        toggle.addEventListener('change', () => {
            source.checked = toggle.checked;
            source.dispatchEvent(new Event('change', { bubbles: true }));
        });

        head.append(back, state, switchLabel);
        tab.insertBefore(head, tab.firstChild);
    }
}

// Enllaç profund: `#tab=<pestanya>&focus=<id del camp>`. La pàgina s'obria
// sempre a «General»; ara el sidebar pot portar l'usuari directament al camp que
// cal (p. ex. la clau d'API) i recarregar no perd la pestanya.
function parseSettingsHash(hash) {
    const params = new URLSearchParams((hash || "").replace(/^#/, ""));
    const tab = params.get("tab");
    const focus = params.get("focus");
    return {
        tab: tab && /^[\w-]+$/.test(tab) ? tab : null,
        focus: focus && /^[\w-]+$/.test(focus) ? focus : null,
    };
}

function applySettingsHash() {
    const { tab, focus } = parseSettingsHash(window.location.hash);
    if (tab && document.getElementById(`tab-${tab}`)) navigateToTab(tab);
    if (focus) {
        const el = document.getElementById(focus);
        // Només s'enfoca si és visible (dins la pestanya activa)
        if (el && el.closest(".tab-pane.active")) {
            // Si és dins d'un bloc plegat (prompts avançats), l'obre abans d'enfocar
            const details = el.closest("details");
            if (details) details.open = true;
            // Camp darrere la casella «mateix vault que Obsidian»: es mostra per poder-hi escriure
            if (focus === "ankiVault") {
                const box = document.getElementById("ankiUseObsidianVault");
                if (box && box.checked) { box.checked = false; toggleAnkiVaultField(); }
            }
            el.focus();
        }
    }
}

// Navigate to tab helper
function navigateToTab(tabId) {
    // Find nav item (might be dynamic)
    const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`);
    
    // Simulate click if exists, otherwise manually switch
    if (navItem) {
        navItem.click();
    } else {
        // Fallback per a sub-pestanyes sense nav-item (p.ex. plugin desactivat):
        // mostra la pestanya i marca «Plugins» al menú (la pàgina n'és una sub-pàgina),
        // perquè no quedi cap element ressaltat que ja no correspon ni cap sense marcar.
        document.querySelectorAll('.nav-item').forEach(n => { n.classList.remove('active'); n.removeAttribute('aria-current'); });
        document.querySelectorAll('.tab-pane').forEach(t => t.classList.remove('active'));
        const tab = document.getElementById(`tab-${tabId}`);
        if (tab) tab.classList.add('active');
        const parent = document.querySelector('.nav-item[data-tab="extensions"]');
        if (parent && tab && tab.querySelector('.plugin-head')) {
            parent.classList.add('active');
            parent.setAttribute('aria-current', 'page');
        }
    }
}

// --- Dynamic Sidebar Logic ---
function updateSidebar() {
    const list = document.getElementById("activeExtensionsList");
    const header = document.getElementById("activeExtensionsHeader");
    list.replaceChildren(); // Clear

    const extensions = [
        { id: "selectpdf", label: "PDF", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' },
        { id: "obsidian", label: "Obsidian", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 13L2 9z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/></svg>' },
        { id: "markdown", label: "Markdown", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 17V7l4 5 4-5v10"/><path d="M15 7h2a5 5 0 0 1 0 10h-2V7z"/></svg>' },
        { id: "deepdive", label: "Aprofundiment", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>' },
        { id: "bionic", label: "Lectura biònica", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>' },
        { id: "science", label: "Validació científica", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-4.734 7.1A4 4 0 0 0 7 20h10a4 4 0 0 0 3.406-6.102l-4.734-7.1A4 4 0 0 1 15 4.789V2"/><path d="M9 2h6"/><path d="M14 15h-4"/><path d="M16 11h-4"/></svg>' },
        { id: "conceptmap", label: "Mapa conceptual", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" /><path d="M12 9V5" /><path d="M12 12l-7 5" /><path d="M12 12l7 5" /><path d="M12 5m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M5 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /><path d="M19 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0" /></svg>' },
        { id: "simple", label: "Explica-ho fàcil", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></svg>' },
        { id: "anki", label: "Targetes Anki", checkboxId: "enableAnki", icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2 2 7l10 5 10-5-10-5Z M2 17l10 5 10-5 M2 12l10 5 10-5"/></svg>' }
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
    extensions.forEach(extension => {
        // Build checkbox ID: resum → enableResum, conceptmap → enableConceptMap, etc.
        let checkboxId;
        if (extension.id === "resum") {
            checkboxId = "enableResum";
        } else if (extension.id === "selectpdf") {
            checkboxId = "enablePdf";
        } else if (extension.id === "conceptmap") {
            checkboxId = "enableConceptMap";
        } else {
            checkboxId = "enable" + extension.id.charAt(0).toUpperCase() + extension.id.slice(1);
        }

        const checkbox = document.getElementById(checkboxId);

        if (checkbox && checkbox.checked) {
            count++;
            const btn = document.createElement("button");
            btn.className = "nav-item dynamic-extension";
            btn.setAttribute("data-tab", extension.id);

            const svgEl = new DOMParser().parseFromString(extension.icon, "text/html").body.firstElementChild;
            btn.appendChild(svgEl);
            btn.appendChild(document.createTextNode(extension.label));

            if (document.getElementById(`tab-${extension.id}`)?.classList.contains('active')) {
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
