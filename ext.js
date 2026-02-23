/**
 * ext.js - Cross-browser extension API wrapper
 * 
 * Provides a unified 'ext' object that bridges Firefox (browser.* + Promises) 
 * and Chrome/Chromium Chromium (chrome.* + Callbacks/Promises).
 */

const isFirefox = typeof browser !== 'undefined';
const baseApi = isFirefox ? browser : chrome;

const ext = {
    ...baseApi,
    // Alias for Context Menus
    menus: baseApi.menus || baseApi.contextMenus,

    // Encapsulate Sidebar functionalities 
    sidebar: {
        open: async () => {
            if (baseApi.sidebarAction && baseApi.sidebarAction.open) {
                return baseApi.sidebarAction.open();
            }
            // For Chrome context, sidePanel API would be handled here
        },
        close: async () => {
            if (baseApi.sidebarAction && baseApi.sidebarAction.close) {
                return baseApi.sidebarAction.close();
            }
        },
        getViews: (filter) => {
            if (baseApi.extension && baseApi.extension.getViews) {
                return baseApi.extension.getViews(filter);
            }
            return [];
        }
    }
};

// Make it globally available
if (typeof globalThis !== 'undefined') {
    globalThis.ext = ext;
} else if (typeof window !== 'undefined') {
    window.ext = ext;
}
