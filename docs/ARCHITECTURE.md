# Architecture Overview

**Document Version**: 1.2  
**Last Updated**: 2026-10-14  
**Audience**: Core developers, maintainers, security auditors  

---

## 🎯 System Overview

The **Resumir** extension is a privacy-first browser extension that summarizes web pages using Google Gemini AI.

**Key Principles**:
- 🔒 **Privacy**: No own servers; page text goes only to Gemini, everything else stays in the browser
- 🚀 **Performance**: Content extraction and caching minimize API calls
- 🌐 **Cross-browser**: Single codebase for Firefox, Chrome, Edge, Brave
- 🧪 **Testability**: Modular architecture with clear boundaries

---

## 🏗️ Component Architecture

### High-Level Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                  BROWSER USER                               │
│           (Firefox / Chrome / Edge / Brave)                 │
└──────┬───────────────────┬──────────────────────┬───────────┘
       │ toolbar / menu /  │                      │
       │ Alt+Shift+S       ▼                      ▼
       │            ┌─────────────┐        ┌──────────────┐
       │            │  SIDEBAR    │        │  SETTINGS    │
       │            │ (sidebar/)  │        │ (options/)   │
       │            │ Main UI,    │        │ Options page │
       │            │ summaries,  │        │              │
       │            │ history     │        │              │
       │            └──┬───────┬──┘        └──────┬───────┘
       ▼               │       │                  │
┌──────────────────┐   │       │ storage.onChanged│
│ BACKGROUND       │   │       └──────────┬───────┘
│ ext.js +         │   │                  │
│ background.js    │   │       ┌──────────▼───────────────────┐
│ • context menus  │   │       │ ext.storage                  │
│ • open sidebar   │   │       │ sync:  preferences, prompts, │
│ • keyboard cmd   │   │       │        plugins, model, theme │
└──────────────────┘   │       │ local: API key, cache /      │
                       │       │        history, usage stats  │
                       │       └──────────────────────────────┘
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────────┐         ┌──────────────────────┐
│ ACTIVE TAB       │         │ GOOGLE GEMINI API    │
│ scripting.       │         │ POST {model}:        │
│ executeScript    │         │ streamGenerateContent│
│ (extract text,   │         │ (SSE)                │
│  highlight quote)│         └──────────────────────┘
└──────────────────┘
```

---

## 📂 Module Breakdown

### Core Modules

#### `sidebar/`
**Purpose**: Main UI for summaries, history, and interaction  
**Key Files**:
- `sidebar.js` — Main controller
- `api.js` — Gemini API integration
- `content.js` — Text extraction from pages
- `summary.js` — Summarization orchestration
- `history.js` — Summary history management
- `cache.js` — Local storage caching
- `stats.js` — Daily request counts (quota)
- `ui.js` — DOM rendering and plugin visibility
- `extractors.js` — Functions injected with `executeScript` (extraction, quote highlight)
- `conceptmap.js` + `markmap-native.js` — Concept map (own SVG renderer)
- `anki.js` — Anki cards plugin
- `pdf-extract.js`, `pdf-viewer.js` / `pdf-viewer.html`, `pdf-zoom.js` — PDF extraction and own PDF viewer
- `youtube-track-select.js` — YouTube caption-track selection
- `conceptmap-filename.js`, `utils.js` — Helpers

**Responsibilities**:
- Display summaries to user
- Manage summary history
- Handle user interactions (buttons, settings)
- Cache summaries to reduce API calls

#### `options/`
**Purpose**: Settings/Options page  
**Key Files**:
- `settings.js` — Main options controller (tabs, pending-changes bar)
- `settings-*.js` — Sub-modules (models, defaults, options, order, cache, stats, backup, sidebar)
- `plugin-registry.js` — Plugin list shown on the settings page

**Responsibilities**:
- Allow users to configure extension
- Manage API key (`storage.local`, never synced)
- Persist settings

#### `shared/`
**Purpose**: Shared utilities across modules  
**Key Files**:
- `models.js` — Curated Gemini models (`CURATED_MODELS`, `DEFAULT_MODEL_ID`)
- `defaults.js` — Default prompts and plugin order
- `content-types.js`, `api-key.js`, `icons.js` — Content types, API key checks, icons

---

## 🔌 Plugin / Extension System

Beyond the core summary, Resumir exposes its capabilities as **plugins** — independent
actions the user can enable, reorder, and (where they have a prompt) customize. Each
plugin surfaces as a button in the sidebar toolbar and a section in the Settings page.

**Single source of truth for order**: `shared/defaults.js` → `DEFAULT_EXTENSION_ORDER`.

| Key | Plugin | Notes |
|-----|--------|-------|
| `resum` | Summary | Core; on by default |
| `selectpdf` | PDF | Core; on by default; extracts remote/local PDFs |
| `simple` | Explica-ho fàcil (plain language) | Editable prompt |
| `deepdive` | Aprofundiment (deep dive) | Editable prompt |
| `science` | Validació científica (scientific review) | Editable prompt |
| `conceptmap` | Mapa conceptual (concept map) | Own SVG renderer (`markmap-native.js`) + fullscreen |
| `obsidian` | Export to Obsidian | `obsidian://` URI; no prompt |
| `markdown` | Copiar Markdown (copy to clipboard) | No prompt |
| `bionic` | Bionic reading | Client-side transform; no API call |
| `anki` | Targetes Anki (flashcards) | Editable prompt; own vault; exports to Obsidian |

**Architecture note**: plugins are currently **static / compiled-in** — there is no
dynamic discovery at runtime. Each plugin is wired across several files (button,
visibility key `enable<Plugin>`, `CONFIG_KEYS`, order, and — if it has a prompt — the
default constant + migration). The full wiring checklist lives in
[`CREAR-PLUGIN.md`](./CREAR-PLUGIN.md); the prompt part is documented inline at the top
of `shared/defaults.js`.

> ⚠️ Common pitfall: a new plugin's `enable<Plugin>` key must also be added to
> `CONFIG_KEYS` in `sidebar/sidebar.js`, or its button renders in Settings but not in
> the sidebar (bug diagnosed 2026-06-10).

The plugin list on the settings page lives in `options/plugin-registry.js` (id, name,
enable key, menu icon); `tests/plugin-registry.test.mjs` keeps the cards in
`settings.html` and the sidebar button names in sync with it. User-created plugins
are not planned.

---

## 🔄 Data Flow

### Summarization Flow

```
User clicks "Resumir" (or Alt+Shift+S / context menu)
        ↓
sidebar/content.js extracts text (scripting.executeScript in the tab)
        ↓
Check cache (sidebar/cache.js) — if found, return
        ↓
Fetch from Gemini API (sidebar/api.js)
        ↓
Format & display result (sidebar/ui.js, sidebar/summary.js)
        ↓
Save to cache/history (sidebar/cache.js, storage.local)
        ↓
Record usage stats (sidebar/cache.js → usageHistory)
```

### Settings Flow

```
User changes setting in Options page (options/settings.js)
        ↓
Pending-changes bar → "Desa"
        ↓
Save to ext.storage.sync (preferences) / ext.storage.local (API key)
        ↓
Sidebar reacts via storage.onChanged (no background messaging)
```

---

## 🔌 Key APIs & Integrations

### Google Gemini API
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse` (streaming SSE; model configurable per l'usuari)
- **Auth**: API key (user-provided)
- **Usage**: Text summarization only
- **Privacy**: Requests originate from user's browser; Gemini may log requests per Google's privacy policy

### Browser Messaging API
- The background script sends context-menu/shortcut triggers to the sidebar (`runtime.sendMessage`)

### ext.storage (sync & local)
- **storage.sync**: preferences, prompts, plugin config, selected model, favourite models
- **storage.local**: API key (not encrypted, never synced), summary cache/history, usage stats
- Web `localStorage` is not used for extension data

---

## 🛡️ Security Considerations

See [`SECURITY.md`](./SECURITY.md) for detailed analysis.

**Key Points**:
- API key stored locally, not transmitted to any server (except Gemini)
- Page text is wrapped in `<UNTRUSTED_CONTENT>` to mitigate prompt injection
- CSP: `script-src 'self'`; `connect-src` allows Gemini and `https:` (remote PDFs, linked HN articles)
- No third-party analytics or tracking

---

## 🧪 Testing Architecture

See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for details.

**Layers**:
- **Unit Tests**: Individual modules (`tests/*.test.mjs`, `npm test`)
- **Integration Tests**: sidebar/settings harnesses with jsdom (`tests/helpers/`)
- **Smoke tests**: real Chromium (`npm run smoke:e2e`) and live connectors (`npm run smoke:connectors`)

---

## 📈 Scalability & Performance

### Caching Strategy
- **Summary Cache**: Store summaries for 30 days (`CACHE_TTL_DAYS` in `sidebar/cache.js`)
- **Cache Invalidation**: Manual clear or time-based

### API Rate Limiting
- Quotes: those of the Google Gemini API (see Google's documentation; they change)
- Fallback: if a model exceeds its quota, the next one is tried automatically (favourites and `fallback: true` models of `CURATED_MODELS`); if all fail, the user is notified

---

## 🔗 Related Documentation

- **Security**: [SECURITY.md](./SECURITY.md)
- **Storage**: [STORAGE_ISOLATION.md](./STORAGE_ISOLATION.md)
- **Plugins**: [CREAR-PLUGIN.md](./CREAR-PLUGIN.md)
- **Development**: [DEV-CONTEXT.md](./DEV-CONTEXT.md), [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Owner**: Sergi Xaudiera  
**Last Updated**: 2026-10-14
