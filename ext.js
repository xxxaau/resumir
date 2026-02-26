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

const isFirefox = typeof browser !== 'undefined';
const baseApi = isFirefox ? browser : chrome;

const ext = {
    ...baseApi,

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
         * Returns sidebar views (for toggle detection).
         * Firefox: extension.getViews({ type: "sidebar" })
         * Chromium: always returns [] (use isOpen state or getContexts instead)
         */
        getViews: (filter) => {
            if (isFirefox) {
                if (baseApi.extension && baseApi.extension.getViews) {
                    return baseApi.extension.getViews(filter);
                }
            }
            // Chromium: getViews({ type: "sidebar" }) is not supported.
            // The background.js toggle logic will fallback to open() on catch.
            return [];
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
        }
    }
};

// Make it globally available
if (typeof globalThis !== 'undefined') {
    globalThis.ext = ext;
} else if (typeof window !== 'undefined') {
    window.ext = ext;
}
