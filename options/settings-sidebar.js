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
        // Menú horitzontal que es desplaça (pantalla estreta): l'entrada activa no pot quedar fora de la vista
        if (target.scrollIntoView) target.scrollIntoView({ inline: 'nearest', block: 'nearest' });
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

// Pàgina de cada plugin → interruptor que governa la seva targeta (del registre)
const PLUGIN_PANES = Object.fromEntries(PLUGIN_REGISTRY.map(p => [p.id, p.enableId]));

// Capçalera comuna de les pàgines de plugin: «← Plugins», estat i interruptor
// (lligat al de la targeta, que és el que es desa). Així un plugin desactivat
// no deixa l'usuari sense camí de tornada ni sense manera d'activar-lo.
function initializePluginHeaders() {
    for (const [pane, enableId] of Object.entries(PLUGIN_PANES)) {
        const tab = document.getElementById(`tab-${pane}`);
        const source = document.getElementById(enableId);
        // Resum és el nucli i té entrada pròpia al menú: no porta «← Plugins» ni interruptor
        if (pane === 'resum' || !tab || !source || tab.querySelector('.plugin-head')) continue;

        const head = document.createElement('div');
        head.className = 'plugin-head';
        const back = document.createElement('button');
        back.type = 'button';
        back.className = 'plugin-back';
        back.textContent = '← Plugins';
        back.addEventListener('click', () => {
            navigateToTab('extensions');
            // Torna el focus al botó que va obrir aquest subpanell
            const opener = document.querySelector(`.btn-icon[data-target="${pane}"]`);
            if (opener) opener.focus();
        });

        const switchLabel = document.createElement('label');
        switchLabel.className = 'switch';
        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        const entry = PLUGIN_REGISTRY.find(p => p.id === pane);
        toggle.setAttribute('aria-label', `Activa ${entry ? entry.label : 'aquest plugin'}`);
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
function navigateToTab(tabId, { focusHeading = false } = {}) {
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
    // Entrar a un subpanell des d'un botó (engranatge) és com canviar de pàgina: el focus va al
    // títol (el focus no pot quedar a un botó de la pàgina anterior, ara amagada).
    if (focusHeading) {
        const heading = document.querySelector(`#tab-${tabId} .page-title`);
        if (heading) { heading.tabIndex = -1; heading.focus(); }
    }
}

// --- Dynamic Sidebar Logic ---
function updateSidebar() {
    const list = document.getElementById("activeExtensionsList");
    const header = document.getElementById("activeExtensionsHeader");
    list.replaceChildren(); // Clear

    const extensions = PLUGIN_REGISTRY.filter(p => p.icon);

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
        const checkbox = document.getElementById(extension.enableId);

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
