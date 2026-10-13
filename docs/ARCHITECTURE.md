# Architecture Overview

**Document Version**: 1.1  
**Last Updated**: 2026-07-03  
**Audience**: Core developers, maintainers, security auditors  

---

## 🎯 System Overview

The **Resumir** extension is a privacy-first browser extension that summarizes web pages using Google Gemini AI.

**Key Principles**:
- 🔒 **Privacy**: All data stays on the user's device
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
└─────────────────┬───────────────────────────────────────────┘
                  │
        ┌─────────┴──────────┬─────────────┐
        │                    │             │
        ▼                    ▼             ▼
   ┌─────────┐          ┌────────┐    ┌─────────┐
   │  POPUP  │          │SIDEBAR │    │SETTINGS │
   │         │          │        │    │ (Options│
   │ Quick   │          │ Main UI│    │  Page)  │
   │ Summary │          │ History│    │         │
   └────┬────┘          └────┬───┘    └────┬────┘
        │                    │             │
        └────────┬───────────┴─────────────┘
                 │
        ┌────────▼────────────────────────┐
        │  BACKGROUND SCRIPT (Service    │
        │  Worker) — ext.js, bg.js       │
        │  ┌──────────────────────────┐  │
        │  │ • Content Extraction     │  │
        │  │ • Cache Management       │  │
        │  │ • History Tracking       │  │
        │  │ • Settings Sync          │  │
        │  └──────────────────────────┘  │
        └────────┬───────────────────────┘
                 │
        ┌────────┴──────────────┐
        │                       │
        ▼                       ▼
   ┌────────────┐          ┌──────────────┐
   │ CONTENT    │          │ GOOGLE       │
   │ SCRIPTS    │          │ GEMINI API   │
   │            │          │ (Public)     │
   │ (Extract   │          │              │
   │  text from │          │ REST API:    │
   │  DOM)      │          │ POST /       │
   └────────────┘          │ streamGenCont│
                           └──────────────┘
        
        LOCAL STORAGE
        ┌──────────────────────────────┐
        │ • API Key (encrypted)        │
        │ • Settings                   │
        │ • Summary Cache              │
        │ • History                    │
        │ • Statistics                 │
        └──────────────────────────────┘
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
- `stats.js` — Usage metrics
- `ui.js` — UI event handlers

**Responsibilities**:
- Display summaries to user
- Manage summary history
- Handle user interactions (buttons, settings)
- Cache summaries to reduce API calls

#### `options/`
**Purpose**: Settings/Options page  
**Key Files**:
- `settings.js` — Main options controller
- `settings-models.js` — Data models
- `settings-defaults.js` — Default values
- `settings-options.js` — Input constraints

**Responsibilities**:
- Allow users to configure extension
- Manage API key securely
- Persist settings

#### `shared/`
**Purpose**: Shared utilities across modules  
**Key Files**:
- `models.js` — Shared data models
- `defaults.js` — Global defaults

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
| `conceptmap` | Mapa conceptual (concept map) | Markmap render + fullscreen |
| `obsidian` | Export to Obsidian | `obsidian://` URI; no prompt |
| `markdown` | Download Markdown | No prompt |
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
User clicks "Summarize Page"
        ↓
Content Script extracts text (sidebar/content.js)
        ↓
Check cache (sidebar/cache.js) — if found, return
        ↓
Fetch from Gemini API (sidebar/api.js)
        ↓
Format & display result (sidebar/sidebar.js)
        ↓
Save to history (sidebar/history.js) + cache
        ↓
Update stats (sidebar/stats.js)
```

### Settings Flow

```
User changes setting in Options page (options/settings.js)
        ↓
Validate input (settings-options.js)
        ↓
Save to localStorage (settings-cache.js)
        ↓
Message background script (messaging API)
        ↓
Broadcast to all tabs (sidebar updates immediately)
```

---

## 🔌 Key APIs & Integrations

### Google Gemini API
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?alt=sse` (streaming SSE; model configurable per l'usuari)
- **Auth**: API key (user-provided)
- **Usage**: Text summarization only
- **Privacy**: Requests originate from user's browser; Gemini may log requests per Google's privacy policy

### Browser Messaging API
- Used to communicate between sidebar, options, and background script
- Ensures only the extension can read/write settings

### localStorage & sessionStorage
- **localStorage**: API key (encrypted), settings, cache, history
- **sessionStorage**: Temporary state during current session

---

## 🛡️ Security Considerations

See [`SECURITY.md`](./SECURITY.md) for detailed analysis.

**Key Points**:
- API key stored locally, not transmitted to any server (except Gemini)
- Content Script tagged with `<UNTRUSTED_CONTENT>` to prevent XSS
- CSP policy restricts `connect-src` to only Gemini API
- No third-party analytics or tracking

---

## 🧪 Testing Architecture

See the testing strategy notes for details.

**Layers**:
- **Unit Tests**: Individual modules (cache, content, api)
- **Integration Tests**: Content Script + API
- **E2E Tests**: Full flow (summarization)

---

## 📈 Scalability & Performance

### Caching Strategy
- **Summary Cache**: Store summaries for 7 days
- **Hit Rate Target**: 60–70% (reduce API costs)
- **Cache Invalidation**: Manual clear or time-based

### API Rate Limiting
- Free tier: ~10–15 requests/minute
- Paid tier: Higher limits
- Fallback: User is notified and can retry

---

## 🔗 Related Documentation

- **Security**: [SECURITY.md](./SECURITY.md)
- **Storage**: Storage strategy
- **API Integration**: API integration
- **Development**: Development guide

---

**Owner**: Sergi Xaudiera  
**Last Updated**: 2026-07-03
