# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Browser extension (Firefox + Chromium, MV3) that summarizes web pages using Google's Gemini AI API. Written in Catalan. Supports streaming SSE responses, bionic reading, Obsidian export, plugin system, and usage statistics.

## Commands

```bash
# Development
npm run dev          # Switch manifests to development mode (adds DEV label to icons)
npm run prod         # Switch manifests to production mode

# Build
npm run build        # Full multi-target build (Firefox + Chromium ZIPs)
npm run build:firefox
npm run build:chromium
npm run manifests:gen   # Regenerate manifest.json + manifest.chromium.json from base + patches
npm run version:sync    # Sync version across all manifests

# Quality
npm test             # Run all 56 unit tests (Node.js built-in test runner)
npm run lint         # ESLint (max 50 warnings before failure)
npm run prerelease   # Full automated pre-release audit

# Run a single test file
node --test tests/stats.test.mjs
```

## Architecture

### Cross-Browser Abstraction
`ext.js` is the single cross-browser wrapper. It detects Firefox vs. Chromium at runtime and normalizes APIs:
- `ext.menus` → `browser.menus` (Firefox) or `chrome.contextMenus` (Chromium)
- `ext.sidebar.*` → `sidebarAction` (Firefox) or `sidePanel` (Chromium)
- All other APIs (`storage`, `runtime`, `tabs`) pass through transparently.

### Manifest Strategy
Never edit `manifest.json` or `manifest.chromium.json` directly — they are generated:
- `manifest.base.json` — shared fields
- `manifest.firefox.patch.json` — adds `sidebar_action`, `browser_specific_settings.gecko`
- `manifest.chromium.patch.json` — adds `side_panel`, `sidePanel`, `contextMenus`
- Run `npm run manifests:gen` after editing any of the above

### Sidebar Module Flow
The sidebar is the main UI. Module responsibilities:
- `sidebar.js` — event orchestrator, initializes everything
- `summary.js` — validates API key, triggers generation, handles errors
- `api.js` — Gemini streaming client (SSE); handles auth and error responses
- `content.js` — extracts page text (detects YouTube/HN/standard via Readability.js)
- `ui.js` — all DOM rendering and plugin visibility
- `cache.js` — read/write cache to `storage.local`
- `stats.js` — daily quota and token tracking
- `utils.js` — Obsidian path/content templating, token estimation, Markdown helpers

For **Chromium production builds**, `sidebar/*.js` is bundled into `sidebar.bundle.js` by esbuild (`scripts/build-sidebar-bundle.mjs`), and `sidebar.html` is patched to reference the bundle.

### Shared State
- `storage.sync` — user preferences, theme, plugins config, API key
- `storage.local` — cache entries, usage stats, model favorites
- `shared/models.js` — `CURATED_MODELS` array is the single source of truth for available Gemini models

### Background Service Worker
`background.js` registers context menus and handles toolbar/menu triggers to open the sidebar. For Chromium, it is bundled to `background.bundle.js` (because `ext.js` uses `import`/`export` which requires bundling for service workers).

### Options Page
`options/settings.js` orchestrates 8 sub-modules (models, plugins, order, stats, cache, etc.). Changes propagate to the sidebar via `storage.onChanged` listener.

## Testing

Tests use Node.js built-in `node:test` — no external framework. Test files are in `tests/*.test.mjs` and import source modules directly using ESM. Browser extension APIs (`browser.*`, `chrome.*`) are mocked inline per test file.

## Build Pipeline

`build.ps1` (PowerShell) orchestrates the full build:
1. Runs `npm run prod` to switch to production manifests
2. Runs esbuild bundling (background + sidebar)
3. Runs `scripts/make-zip.mjs` to create AMO-compliant ZIPs with `/` path separators
4. Outputs `resumir-contingut-vX.Y.Z-firefox.zip` and `resumir-contingut-vX.Y.Z-chromium.zip`

`npm run prerelease` runs `scripts/pre-release-check.mjs` which audits version consistency, manifest validity, and other release criteria before tagging.
