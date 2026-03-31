# Source Text Panel — Design Spec
Date: 2026-03-31

## Overview

Add a new icon button to the sidebar bottom bar (next to the cache badge and history button) that lets the user inspect the raw plain text that was sent to the AI for summarization. This is useful for verifying what content was extracted from a page, reading YouTube transcripts, or debugging extraction issues.

## Goal

Show the plain extracted text (with whitespace and line breaks preserved) in the sidebar when the user clicks the new button. A "← Tornar" button returns to the previous view.

---

## 1. HTML — `sidebar/sidebar.html`

**New button** inside `#history-cache-group`, to the left of `#historyBtn`:

```html
<button
  id="sourceTextBtn"
  title="Veure text enviat a resumir"
  aria-label="Veure text enviat a resumir"
  disabled
  style="background:none;border:none;cursor:pointer;padding:0 2px;font-size:1em;color:var(--footer-text);line-height:1"
>
  <!-- SVG document icon -->
</button>
```

**New panel** inside `#container`, parallel to `#history-panel`:

```html
<div id="source-panel" class="hidden"></div>
```

The button starts `disabled`. It is enabled when `currentSourceText` is set.

---

## 2. CSS — `sidebar/sidebar.css`

**`#source-panel`** — mirrors `#history-panel`:
```css
#source-panel {
  overflow-y: auto;
  padding: 4px 0;
  max-height: calc(100vh - 100px);
}
```

**Source text display element** (`.source-text-content`):
```css
.source-text-content {
  white-space: pre-wrap;
  font-family: monospace;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-color);
  padding: 4px 0;
}
```

**Panel header** (`.source-panel-header`) — same style as `.history-header`.

---

## 3. JS — `sidebar/history.js`

Two new exported functions, following the exact same open/close pattern as `openHistoryPanel` / `closeHistoryPanel`.

### `openSourcePanel(text)`

1. Hides `#history-panel` directly (clears innerHTML, no state restoration) — prevents overlap if history was open
2. Hides `contentDiv`, `loadingDiv`, `errorDiv`, `page-title-strip`
3. Hides `history-back-bar` (in case it was visible)
4. Snapshots `_previousVisible` for restoration
5. Renders `#source-panel` with:
   - A header div (`.source-panel-header`) containing:
     - `← Tornar` button (`.history-back-btn`) → calls `closeSourcePanel()`
     - A `<span>` label: `"Text enviat a resumir"`
   - A `<pre class="source-text-content">` with the raw text
6. Shows `#source-panel`

### `closeSourcePanel()`

1. Hides `#source-panel`, clears its innerHTML
2. Restores `_previousVisible`

Both functions reuse the existing `_previousVisible` module-level variable in `history.js`.

**Exports** — add `openSourcePanel` and `closeSourcePanel` to the `module.exports` block.

---

## 4. JS — `sidebar/sidebar.js`

### References
```js
const sourceTextBtn = document.getElementById("sourceTextBtn");
```

### Button enable/disable
`sourceTextBtn` follows the same pattern as `copyBtn`:
- Disabled by default (set in HTML)
- Enabled in `ctx.setSourceText` wrapper: when `t` is a non-empty string, `sourceTextBtn.disabled = false`; when empty, `sourceTextBtn.disabled = true`
- Also enabled/disabled inside `setGeneratingState` and `resetUI` in `ui.js` — **no**, `sourceTextBtn` is not managed by `ui.js` since it's not a summary action button. It is managed directly in `sidebar.js` via a local helper `updateSourceBtn()`.

### `updateSourceBtn()`
```js
function updateSourceBtn() {
  if (sourceTextBtn) sourceTextBtn.disabled = !currentSourceText;
}
```

Called every time `currentSourceText` is updated:
- Wrap the existing `setSourceText` in `ctx`: `setSourceText: (t) => { currentSourceText = t; updateSourceBtn(); }`

### Click handler
```js
if (sourceTextBtn) sourceTextBtn.addEventListener("click", () => {
  if (!currentSourceText) return;
  openSourcePanel(currentSourceText);
});
```

---

## 5. State management

| State | `sourceTextBtn` |
|-------|----------------|
| Initial load (no summary yet) | `disabled` |
| Preload completes (cache hit, background fetch done) | `enabled` |
| Summary generated | `enabled` |
| Source panel open | `enabled` — clicking again re-renderitza el panel (reseteja el scroll) |
| History panel open | N/A — footer still visible |

`currentSourceText` is never persisted. If the sidebar is closed and reopened, the button starts disabled again until a new summary or preload completes.

---

## 6. Icon

SVG icon: a simple document/file icon (outline style, consistent with other toolbar buttons). Dimensions `width="14" height="14"` to match the footer button scale.

---

## 7. Files changed

| File | Change |
|------|--------|
| `sidebar/sidebar.html` | New `#sourceTextBtn` button + `#source-panel` div |
| `sidebar/sidebar.css` | `#source-panel`, `.source-panel-header`, `.source-text-content` |
| `sidebar/history.js` | `openSourcePanel(text)`, `closeSourcePanel()` |
| `sidebar/sidebar.js` | Wire button, `updateSourceBtn()`, update `ctx.setSourceText` |

No new files. No tests required (pure DOM rendering, no logic to unit-test beyond what's already covered by history panel patterns).
