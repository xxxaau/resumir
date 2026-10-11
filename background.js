/* This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/. */

// Toolbar action click → open/close the sidebar.
//  - Firefox: browser.sidebarAction.toggle() is the native open/close, and
//    Firefox has no "open panel on action click" bound to the panel, so we
//    register this listener.
//  - Chromium/Edge: the browser opens AND closes the panel natively via
//    setPanelBehavior({openPanelOnActionClick:true}) below. We deliberately do
//    NOT register an onClicked listener there: registering one SUPPRESSES the
//    native open-on-click behavior (they are mutually exclusive), leaving the
//    toolbar icon dead. The native path also gives us close-on-click for free,
//    which chrome.sidePanel has no API for.
if (ext.isFirefox) {
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
// onInstalled). No-op on Firefox. If this fails, the icon does nothing on
// Chromium — log it loudly instead of dying as an unhandled rejection.
ext.sidebar.setPanelBehavior({ openPanelOnActionClick: true })
  .catch(err => console.error("[sidebar] setPanelBehavior failed (toolbar icon will be inert):", err));

// --- Context Menus ---

ext.runtime.onInstalled.addListener(async (_details) => {
  // Chromium: open the side panel when the toolbar icon is clicked (native
  // open/close). Persisted across restarts; also re-applied at top-level above.
  ext.sidebar.setPanelBehavior({ openPanelOnActionClick: true })
    .catch(err => console.error("[sidebar] setPanelBehavior failed (toolbar icon will be inert):", err));

  // NOTA permisos: <all_urls> és host_permissions REQUERIT al manifest.
  // A Chromium es concedeix a la instal·lació. A Firefox MV3 els host
  // permissions són opcionals per naturalesa: demanar-los aquí NO funciona
  // (permissions.request exigeix un gest d'usuari i onInstalled no en té),
  // així que el camí real de concessió és executeScriptSafe (content.js),
  // que els demana sota el gest del primer "Resumir".

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
  // .catch() attached HERE, a la creació: la branca "summarize-selection" pot
  // fer `return` abans d'arribar mai a l'`await openPromise` de sota (quan no
  // hi ha text seleccionat), cosa que deixaria un rebuig de promesa no
  // gestionat si ext.sidebar.open() fallés.
  const openPromise = ext.sidebar.open(tab.windowId)
      .catch(err => console.error("[sidebar] open error:", err));

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
      await openPromise;
      await requestPageSummary(tab);
  }
});

// Demana a la sidebar (oberta o per obrir) que resumeixi la pàgina d'una pestanya.
async function requestPageSummary(tab) {
  await ext.storage.local.set({ pendingSummary: { type: 'page', url: tab.url } });
  try {
      await ext.runtime.sendMessage({
          action: "trigger_summary",
          data: { type: 'page', url: tab.url }
      });
  } catch (e) {
      // Sidebar likely closed: el pickup per storage ho gestionarà en obrir-se
  }
}

// Drecera de teclat (manifest `commands`): obre la sidebar i resumeix la pàgina.
// open() va PRIMER (sense cap await abans) per conservar el gest d'usuari a Chrome.
if (ext.commands && ext.commands.onCommand) {
  ext.commands.onCommand.addListener(async (command, tab) => {
    if (command !== "summarize-page" || !tab) return;
    const openPromise = ext.sidebar.open(tab.windowId)
        .catch(err => console.error("[sidebar] open error:", err));
    await openPromise;
    await requestPageSummary(tab);
  });
}

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
