ext.action.onClicked.addListener(async (tab) => {
  try {
    const sidebarViews = ext.sidebar.getViews({ type: "sidebar", windowId: tab.windowId });
    if (sidebarViews.length > 0) {
      await ext.sidebar.close();
    } else {
      await ext.sidebar.open();
    }
  } catch (err) {
    console.error("Error toggling sidebar:", err);
    ext.sidebar.open();
  }
});

// --- Context Menus ---

ext.runtime.onInstalled.addListener(() => {
  // Chromium: register side panel to open on action click
  ext.sidebar.setPanelBehavior({ openPanelOnActionClick: true });

  // Create context menu items
  ext.menus.create({
    id: "summarize-selection",
    title: "Resumir text seleccionat",
    contexts: ["selection"]
  });

  ext.menus.create({
    id: "summarize-page",
    title: "Resumir contingut",
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
