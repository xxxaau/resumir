# Cache Badge + History Load Design

**Date:** 2026-03-30
**Status:** Approved

## Goal

Two related UX improvements that surface cached summaries more prominently:

1. **Cache badge** — show a small `⚡ En caché` indicator in the sidebar toolbar when the current tab's URL has a valid cached summary.
2. **History load** — in the settings stats page request history table, clicking an entry loads the cached summary in the sidebar instead of opening the original URL.

---

## Architecture

Two independent components sharing `getSummaryCache(url)` from `sidebar/cache.js`.

**Component 1:** `sidebar.js` checks cache for the active tab URL and updates a badge element in the toolbar.

**Component 2:** `options/settings-stats.js` replaces `<a>` links in the history table with clickable elements that write `pendingCacheLoad` to `storage.local`. `background.js` opens the sidebar on that change. `sidebar.js` listens for the key and loads the cached summary.

---

## Component 1: Cache Badge in Sidebar Toolbar

### HTML (`sidebar/sidebar.html`)

Add `<span id="cache-badge" class="hidden">⚡ En caché</span>` inside the toolbar, after the summarize button.

### CSS (`sidebar/sidebar.css`)

```css
#cache-badge {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
  align-self: center;
  white-space: nowrap;
}
```

The badge uses `margin-left: auto` to push it to the right of the toolbar. It is hidden by default via `.hidden`.

### JS (`sidebar/sidebar.js`)

New function `updateCacheBadge(url)`:
- Calls `getSummaryCache(url)`
- If valid entry exists: removes `.hidden` from `#cache-badge`
- If no cache: adds `.hidden` to `#cache-badge`

Called from:
- Sidebar initialization (current tab URL)
- `tabs.onActivated` listener (tab switch)
- `tabs.onUpdated` listener when `changeInfo.url` is present (navigation)
- After a summary is generated successfully (to reflect new cached state)

The badge is hidden when the history panel is open (not relevant in that context — no change needed, as the toolbar is hidden when the history panel is shown).

---

## Component 2: History Table → Load in Sidebar

### `options/settings-stats.js` — `renderHistoryTable`

Replace the `<a href="entry.url">` anchor with a `<span>` styled as a link (`cursor: pointer`, `color: var(--primary-color)`).

On click:
1. Check if URL has a valid cache entry: `ext.storage.local.get('summary_cache:' + entry.url)` — or use `getSummaryCache` if available in options context.
   - **If cached:** write `ext.storage.local.set({ pendingCacheLoad: entry.url })`
   - **If not cached** (entry in usageHistory but cache expired or purged): open original URL as fallback: `window.open(entry.url, '_blank')`

Since `getSummaryCache` is defined in `sidebar/cache.js` (not loaded in options), the options page checks the storage key directly: `summary_cache:{url}` — check `data.timestamp` + 30-day TTL, same logic as `getSummaryCache`.

### `background.js`

Add `storage.onChanged` listener:

```js
ext.storage.local.onChanged.addListener(changes => {
    if (changes.pendingCacheLoad) {
        ext.sidebar.open(); // opens sidebar for the current window
    }
});
```

Note: `ext.storage.local.onChanged` vs `browser.storage.onChanged` — use the correct API. Background already uses `ext.*` wrappers where available.

### `sidebar/sidebar.js`

Add `storage.onChanged` listener:

```js
ext.storage.local.onChanged((changes) => {
    if (changes.pendingCacheLoad?.newValue) {
        const url = changes.pendingCacheLoad.newValue;
        ext.storage.local.remove('pendingCacheLoad');
        getSummaryCache(url).then(cached => {
            if (cached) loadHistoryEntry(cached);
        });
    }
});
```

`loadHistoryEntry(entry)` is the existing function in `sidebar/history.js` that renders a cached summary into the sidebar content area.

---

## Files Modified

| File | Change |
|------|--------|
| `sidebar/sidebar.html` | Add `#cache-badge` span to toolbar |
| `sidebar/sidebar.css` | Style for `#cache-badge` |
| `sidebar/sidebar.js` | `updateCacheBadge(url)` function + `storage.onChanged` listener for `pendingCacheLoad` |
| `background.js` | `storage.onChanged` listener to open sidebar on `pendingCacheLoad` |
| `options/settings-stats.js` | Replace `<a>` with clickable span in `renderHistoryTable`, check cache inline |

---

## Edge Cases

- **URL not in cache** (usageHistory entry with expired/purged cache): fallback to `window.open(url, '_blank')` from settings page. `pendingCacheLoad` key is never written in this path.
- **Sidebar already open**: `storage.onChanged` fires in the sidebar regardless. The sidebar loads the summary directly without needing to re-open.
- **Rapid multiple clicks**: the key is removed immediately on processing (`storage.local.remove`). A second click writes a new value and the cycle repeats correctly.
- **`storage.onChanged` API shape**: Firefox uses `browser.storage.local.onChanged` or `browser.storage.onChanged`. Chromium uses `chrome.storage.onChanged`. The `ext.js` wrapper does not currently abstract `storage.onChanged` — both components must use `browser.storage.onChanged` (with the `"local"` area filter) directly, with the same cross-browser pattern already used elsewhere in the extension.
- **Background `storage.onChanged`**: Background service worker is always running in Chromium; in Firefox it can sleep. The `storage.onChanged` listener in the background is appropriate for both platforms.
- **Badge visibility after navigation**: when the user navigates to a new URL, `tabs.onUpdated` fires with the new URL and the badge updates (show/hide) accordingly.
