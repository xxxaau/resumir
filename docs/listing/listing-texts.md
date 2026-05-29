# Store Listing Texts

## Short Description (≤132 characters — CWS limit)

```
Summarize any web page with Google Gemini AI. Supports YouTube, Hacker News, Twitter/X, and bionic reading.
```
(104 chars ✓)

---

## Long Description (English)

**Resumir** summarizes any web page using Google Gemini AI, directly inside a sidebar — no copy-pasting required.

### Features

- **One-click summarization** — click the toolbar button or right-click any page to get an AI summary in the sidebar
- **Streaming responses** — text appears in real time as the AI generates it
- **Smart content extraction** — specialized extractors for YouTube (transcript), Hacker News (article + comments), Twitter/X (Defuddle), **PDF files** (text layer via pdf.js), and standard pages (Readability.js)
- **Bionic Reading** — configurable fixation mode to improve reading speed
- **Multiple themes** — system default, light, dark, solarized, sepia, soft gray
- **Summary cache** — previously summarized pages load instantly from local cache (30-day TTL)
- **Usage statistics** — daily token and cost tracking per Gemini model, with period selector (7d / 30d / 6m / 1y)
- **Obsidian export** — send summaries directly to your Obsidian vault
- **Plugin system** — enable, disable, and reorder functionality from settings
- **Firefox + Chromium** — works on Firefox, Chrome, Edge, and Brave

### Privacy

- Your API key is stored locally on your device (`storage.local`) and never leaves your browser
- Page content is sent directly to Google Gemini API — no third-party servers involved
- No telemetry, no analytics, no account required

### Requirements

- A free Google Gemini API key (from [Google AI Studio](https://aistudio.google.com/))
- Firefox 139+ or Chrome/Edge/Brave (Manifest V3)

---

## Single Purpose Statement (CWS)

```
Summarize the active web page using Google Gemini AI, displayed in the browser sidebar.
```

---

## Permission Justifications (CWS)

### `activeTab`
Required to read the URL and title of the current tab when the user triggers a summary. Without this, the extension cannot identify which page to summarize.

### `scripting`
Required to inject the content extraction script into the active tab to read page text (via Readability.js or specialized extractors for YouTube/HN/Twitter). Content is sent to the Gemini API and never stored remotely.

### `storage`
Required to persist user settings (API key, theme, plugin configuration, model preferences) and the local summary cache. All data stays on the user's device.

### `tabs`
Required to open the sidebar panel and to detect tab navigation (so the extension can show the cached badge when a previously summarized page is revisited).

### `sidePanel` / `sidebar_action`
Required to display the summary in the browser sidebar without opening a new tab or popup.

### `contextMenus` / `menus`
Required to add the "Summarize this page" option to the right-click context menu.

### `<all_urls>` (optional, requested at runtime)
Requested only when the user first triggers a summary on a page. Required to inject the content extraction script into any URL. The user can grant or deny this permission — the extension requests it only when needed, not at install time.

---

## Category

| Store | Category |
|-------|----------|
| Chrome Web Store | Productivity |
| Firefox Add-ons (AMO) | Productivity |

---

## Store Metadata

| Field | Value |
|-------|-------|
| Homepage URL | https://github.com/[USERNAME]/extensio-resumir-contingut |
| Support URL | https://github.com/[USERNAME]/extensio-resumir-contingut/issues |
| Privacy Policy URL | https://[USERNAME].github.io/extensio-resumir-contingut/PRIVACY_POLICY |

> Replace `[USERNAME]` with the real GitHub handle once decided.
