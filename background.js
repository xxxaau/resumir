browser.action.onClicked.addListener(async (tab) => {
  try {
    const sidebarViews = browser.extension.getViews({ type: "sidebar", windowId: tab.windowId });
    if (sidebarViews.length > 0) {
      await browser.sidebarAction.close();
    } else {
      await browser.sidebarAction.open();
    }
  } catch (err) {
    console.error("Error toggling sidebar:", err);
    browser.sidebarAction.open();
  }
});

// --- Context Menus ---

browser.runtime.onInstalled.addListener(() => {
  // Create context menu items
  browser.menus.create({
    id: "summarize-selection",
    title: "Resumir text seleccionat amb Gemini",
    contexts: ["selection"]
  });

  browser.menus.create({
    id: "summarize-page",
    title: "Resumir contingut",
    contexts: ["page", "all"], // 'all' covers cases where page context might be ambiguous
    icons: {
       "16": "icons/icon-16.png"
    }
  });
});

browser.menus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "summarize-selection") {
      const text = info.selectionText;
      if (!text) return;

      // 1. Store text for sidebar to pick up if it opens
      await browser.storage.local.set({ pendingSummary: { type: 'selection', content: text } });

      // 2. Open Sidebar (if not open)
      await browser.sidebarAction.open();

      // 3. Send message (if already open)
      try {
          await browser.runtime.sendMessage({ 
              action: "trigger_summary", 
              data: { type: 'selection', content: text } 
          });
      } catch (e) {
          // Sidebar likely not open or ready yet, storage pickup will handle it
      }

  } else if (info.menuItemId === "summarize-page") {
      // 1. Store action
      await browser.storage.local.set({ pendingSummary: { type: 'page', url: tab.url } });
      
      // 2. Open Sidebar
      await browser.sidebarAction.open();

      // 3. Send Message
      try {
          await browser.runtime.sendMessage({ 
              action: "trigger_summary", 
              data: { type: 'page', url: tab.url } 
          });
      } catch (e) {
          // Sidebar likely closed
      }
  }
});
