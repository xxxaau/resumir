/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Toolbar action click → open/close the sidebar.
//  - Firefox: browser.sidebarAction.toggle() is the native open/close, and
//    Firefox has no "open panel on action click" bound to the panel, so we
//    register this listener. (getBrowserInfo is a Firefox-only API.)
//  - Chromium/Edge: the browser opens AND closes the panel natively via
//    setPanelBehavior({openPanelOnActionClick:true}) below. We deliberately do
//    NOT register an onClicked listener there: it is mutually exclusive with
//    the native behavior, and driving chrome.sidePanel.open() ourselves proved
//    unreliable on Edge (the call resolves but the panel never appears). Letting
//    the browser open the panel avoids the user-gesture/async pitfalls entirely.
if (typeof ext.runtime.getBrowserInfo === "function") {
  ext.action.onClicked.addListener(async (tab) => {
    try {
      await ext.sidebar.toggle(tab.windowId);
    } catch (err) {
      console.error("[sidebar] toggle error:", err);
    }
  });
}

// Chromium/Edge: open/close the side panel when the toolbar icon is clicked.
// Re-applied on every service worker startup (a revived worker won't re-run
// onInstalled). No-op on Firefox.
ext.sidebar.setPanelBehavior({ openPanelOnActionClick: true });

// --- Context Menus ---

ext.runtime.onInstalled.addListener(async (details) => {
  // Chromium: open the side panel when the toolbar icon is clicked (native
  // open/close). Persisted across restarts; also re-applied at top-level above.
  ext.sidebar.setPanelBehavior({ openPanelOnActionClick: true });

  if (details.reason === "install") {
    // Firefox: request all_urls permission on first install only
    if (ext.runtime.getBrowserInfo) {
      try {
        const browserInfo = await ext.runtime.getBrowserInfo();
        if (browserInfo.name === "Firefox") {
          ext.permissions.request({
            permissions: [],
            origins: ["<all_urls>"]
          }).catch(() => {});
        }
      } catch (_e) {
        // getBrowserInfo not available (Chromium), skip silently
      }
    }
  }

  // Recreate context menus on install and update (browser clears them on update).
  // Both Firefox (browser.menus) and modern Chromium (chrome.contextMenus) return
  // Promises from removeAll(); awaiting avoids a race where create() runs before
  // the previous menus are cleared.
  await ext.menus.removeAll();
  ext.menus.create({
    id: "summarize-selection",
    title: "Resumir text seleccionat",
    contexts: ["selection"]
  });
  ext.menus.create({
    id: "summarize-page",
    title: "Resumir",
    contexts: ["page", "all"]
  });
});

ext.menus.onClicked.addListener(async (info, tab) => {
  // 1. Open Sidebar IMMEDIATELY to preserve user gesture token
  // Awaiting anything before calling open() invalidates the token in Chrome.
  const openPromise = ext.sidebar.open(tab.windowId);

  if (info.menuItemId === "summarize-selection") {
      const text = info.selectionText;
      if (!text) return;

      // 2. Store text for sidebar to pick up if it opens
      await ext.storage.local.set({ pendingSummary: { type: 'selection', content: text } });

      await openPromise;

      // 3. Send message (if already open)
      try {
          await ext.runtime.sendMessage({
              action: "trigger_summary",
              data: { type: 'selection', content: text }
          });
      } catch (e) {
          // Sidebar likely not open or ready yet, storage pickup will handle it
      }

  } else if (info.menuItemId === "summarize-page") {
      // 2. Store action
      await ext.storage.local.set({ pendingSummary: { type: 'page', url: tab.url } });

      await openPromise;

      // 3. Send Message
      try {
          await ext.runtime.sendMessage({
              action: "trigger_summary",
              data: { type: 'page', url: tab.url }
          });
      } catch (e) {
          // Sidebar likely closed
      }
  }
});

// Obrir la sidebar quan la pàgina de stats demana carregar un resum en caché.
// pendingCacheLoad is set from a user-initiated click on the settings page,
// which preserves the user gesture for sidebar.open() in Chromium.
// Value can be a URL string (backward compat) or JSON.stringify({url, type}).
ext.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.pendingCacheLoad?.newValue) {
        ext.sidebar.open().catch(err => {
            // User gesture may have expired (e.g. delayed listener) — sidebar
            // pickup via storage event will handle it on next open.
            console.debug("Sidebar open from cache trigger failed:", err?.message);
        });
    }
});
