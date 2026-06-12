/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * ext.js - Cross-browser extension API wrapper
 * 
 * Provides a unified 'ext' object that bridges Firefox (browser.* + Promises) 
 * and Chrome/Chromium (chrome.* + Callbacks/Promises).
 * 
 * Supported APIs:
 *   ext.menus        → browser.menus (Firefox) / chrome.contextMenus (Chromium)
 *   ext.sidebar.*    → browser.sidebarAction (Firefox) / chrome.sidePanel (Chromium)
 *   ext.*            → all other APIs pass through unchanged
 */

// IMPORTANT: el Chromium/Edge modern (≥ Chrome ~140) TAMBÉ exposa un global
// `browser`, així que `typeof browser !== 'undefined'` NO és una detecció vàlida
// de Firefox (és cert també a Edge/Chrome). Si s'usa, tot ext.sidebar agafa la
// branca de Firefox a Chromium i el side panel no s'obre mai.
// Detectem Firefox per l'API que de fet ens cal distingir: `sidebarAction`
// existeix només a Firefox; Chromium (i el seu global `browser`) usa `sidePanel`.
const isFirefox = typeof browser !== "undefined" &&
                  typeof browser.sidebarAction !== "undefined";
const baseApi = isFirefox ? browser : chrome;

const ext = {
    ...baseApi,

    // Única font de veritat de la detecció de navegador. Els consumidors
    // (background.js, etc.) han d'usar ext.isFirefox, MAI una detecció pròpia:
    // les heurístiques ad-hoc divergeixen (vegeu el bug del global `browser`).
    isFirefox,

    // Alias for Context Menus (Firefox: menus, Chromium: contextMenus)
    menus: baseApi.menus || baseApi.contextMenus,

    // Unified Sidebar/SidePanel API
    sidebar: {
        /**
         * Opens the sidebar/side panel.
         * Firefox: browser.sidebarAction.open()
         * Chromium: chrome.sidePanel.open({ windowId }) — requires Chrome 116+
         */
        open: async (windowId) => {
            if (isFirefox) {
                if (baseApi.sidebarAction && baseApi.sidebarAction.open) {
                    return baseApi.sidebarAction.open();
                }
            } else {
                if (baseApi.sidePanel && baseApi.sidePanel.open) {
                    const opts = {};
                    if (windowId) {
                        opts.windowId = windowId;
                    } else {
                        // Get current window if no windowId provided
                        try {
                            const win = await baseApi.windows.getCurrent();
                            opts.windowId = win.id;
                        } catch (e) {
                            console.warn("ext.sidebar.open: could not get current window", e);
                        }
                    }
                    return baseApi.sidePanel.open(opts);
                }
            }
        },

        /**
         * Closes the sidebar/side panel.
         * Firefox: browser.sidebarAction.close()
         * Chromium: no native close API — disables the panel temporarily
         */
        close: async () => {
            if (isFirefox) {
                if (baseApi.sidebarAction && baseApi.sidebarAction.close) {
                    return baseApi.sidebarAction.close();
                }
            } else {
                // Chromium: sidePanel has no close() — workaround: disable then re-enable
                if (baseApi.sidePanel && baseApi.sidePanel.setOptions) {
                    await baseApi.sidePanel.setOptions({ enabled: false });
                    // Re-enable after a tick so user can open it again
                    setTimeout(() => {
                        baseApi.sidePanel.setOptions({ enabled: true });
                    }, 100);
                }
            }
        },

        /**
         * Sets side panel behavior (Chromium only).
         * Configures whether clicking the action button opens the side panel.
         * No-op on Firefox (sidebarAction handles this natively).
         */
        setPanelBehavior: async (options) => {
            if (!isFirefox && baseApi.sidePanel && baseApi.sidePanel.setPanelBehavior) {
                return baseApi.sidePanel.setPanelBehavior(options || {
                    openPanelOnActionClick: true
                });
            }
        },

        /**
         * Toggles the sidebar/side panel (open if closed, close if open).
         * Firefox: browser.sidebarAction.toggle()
         * Chromium: no native toggle — falls back to open() (panel is already
         *           managed by setPanelBehavior + openPanelOnActionClick).
         */
        toggle: async (windowId) => {
            if (isFirefox) {
                if (baseApi.sidebarAction && baseApi.sidebarAction.toggle) {
                    return baseApi.sidebarAction.toggle();
                }
            } else {
                return ext.sidebar.open(windowId);
            }
        }
    }
};

// Make it globally available
if (typeof globalThis !== 'undefined') {
    globalThis.ext = ext;
} else if (typeof window !== 'undefined') {
    window.ext = ext;
}

// Export per a entorn Node.js (tests unitaris). Ignorat al navegador.
if (typeof module !== "undefined" && module.exports) {
    module.exports = ext;
}
