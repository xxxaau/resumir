# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security
- **Important notice for users before v2.2**: If you installed the extension before version 2.2, your Gemini API key may have been stored in `storage.sync` (synced across devices). From v2.2 onwards, the key is stored exclusively in `storage.local`. It is recommended to **rotate your API key** from Google AI Studio as a precaution.

---

## [2.2.4] - 2026-04-27

### Added
- Animated loading indicator with dots during summary generation
- YouTube transcript extraction refactor: MAIN world extraction (Step 1) + API fallback (Step 2)
- Support for `prerenderedText` when `playerCaptionsTracklistRenderer` is empty
- Direct transcript reading from `ytInitialData` without opening the transcript panel
- Prompt injection guard: `<UNTRUSTED_CONTENT>` wrapper in system prompt
- API key migrated from `storage.sync` to `storage.local` for better security isolation

### Fixed
- YouTube transcript panel not opening when navigating to a video
- YouTube transcript detection significantly more robust
- Loading dots now hidden on first streaming chunk (no flash of empty state)
- Toolbar stays on top when viewing cached history entries
- Back bar hidden when closing panels to return to main view
- Back button bar alignment with toolbar; menu hidden when viewing panels

### Changed
- Layout reordered when viewing a cached summary
- `.hidden` CSS class now always hides elements regardless of specificity

---

## [2.2.3] - 2026-04-23

### Added
- YouTube ASR (auto-generated) transcript extraction improvements
- Daily counter for precise per-period statistics
- Stats history limit increased from 100 to 1,000 entries
- Persistence tests: validate data integrity across version updates

### Fixed
- YouTube transcript reading from `ytInitialData` (full ASR support)
- Active track detection in YouTube transcript extraction
- `onInstalled` handler: prevent duplicate context menus on update
- Memory leaks in cache and button bindings
- API model fallback expanded; improved API error messages

### Performance
- Sidebar startup time improved
- API calls: added timeouts and improved reliability
- Stats: unified `getDailyStats` reads into a single `storage.get` call

### Changed
- Production manifest name corrected (no longer includes `DEV` label)
- ESLint globals fixed; pre-commit lint hook added

---

## [2.2.2] - 2026-04-22

### Added
- Cache operations now use a summary index for faster purge and listing
- Cross-platform PowerShell wrapper (`build.ps1`) with script existence check
- Changelog auto-injected into `settings.html` on version bump (`postversion` script)
- Firefox/Chromium build and release commands documented in `BUILD.md`

### Fixed
- Cache index fallback: purge and list work correctly when index is missing
- Options page button bindings corrected
- Chromium production manifest no longer contains embedded Chrome key
- Bionic styling extracted into dedicated helper; summary rendering hardened
- Options settings event bindings refactored; page size handling hardened

### Changed
- Release flow preserves original dev/prod mode and writes JSON patch files without BOM
- Build backup directories (`build_*/`) excluded from git

---

## [2.2.1] - 2026-04-07

### Added
- Improved bottom bar: token usage display with UX enhancements

### Fixed
- ESLint globals for default prompts corrected
- Stream usage in `summary.js` fixed

### Changed
- Settings refactored: defaults and UI simplified
- Manifests regenerated in PROD mode (name no longer contains `DEV`)

---

## [2.2.0] - 2026-04-01

### Added
- Source text panel: view the plain text sent to the AI for summarization
- Twitter/X content extraction via Defuddle library with DOM scraping fallback
- Hacker News: removed comment limit; added linked article fetching
- Readability.js loaded in sidebar context for HN article fetch
- Cache badge: clickable badge showing cached status in the toolbar
- Stats: period selector (7d / 30d / 6m / 1y) for KPIs, chart, and table
- Stats: columns for input tokens, output tokens, cache hits, and avg ms
- Real token counts from Gemini API `usageMetadata` (replaces estimates)
- Stats history: load cached summary directly in sidebar (not just open URL)
- Page title strip: sticky bar showing current page title during summarization
- History panel: navigable list of past summaries in the sidebar
- `listCachedSummaries` for the history panel

### Fixed
- Cache: TTL of 30 days with `purgeStaleCacheEntries` for stale entries
- Cache: `clearCache` now erases all `summary_cache:*` keys, not just indexed ones
- Summary: content div visible during streaming (was hidden until end)
- Summary: quota fallback respects favourite models and avoids expensive models
- Models: token limit per model via `contextWindow`; `EUR_RATE` moved to `shared/models.js`
- Sidebar: duplicate conditional removed from `apiKey` listener
- Stats: guard for invalid dates; `toLocaleString` formatting for tokens
- Stats: weekly/monthly grouping functions (`getMondayOfWeek`, `filterHistoryByPeriod`)

### Performance
- Streaming: plain text during streaming, full Markdown render on completion
- Cache: combined two sequential `saveUsageStats` reads into one `storage.get`
- Models: `favoriteModels` read at initialization, avoiding extra `storage.sync` call

### Changed
- `defuddle` added as vendor npm dependency (pinned `^0.14.0`)
- Sidebar bundle includes `history.js`

---

## [2.1.0] - 2026-03-04

### Added
- Favourite models system: pin preferred Gemini models to the top of the list
- Pre-release check script (`scripts/pre-release-check.mjs`) with automated audit
- Chromium sidebar bundled with esbuild (`scripts/build-sidebar-bundle.mjs`)
- CI/CD: GitHub Actions workflows for lint, tests, and release
- ESLint integrated project-wide; Node.js built-in test runner (56 tests, 0 failures)
- `CURATED_MODELS` unified in `shared/models.js` as single source of truth
- Bionic state managed via CSS class (no inline styles)
- Pre-generated icons in `img/`; `set_dev_mode.ps1` improved
- `shared/defaults.js` extracted for default prompt values

### Fixed
- `getCuratedModelInfo` corrected for model variants
- Build compatibility for Linux (GitHub Actions `ubuntu-latest`)

### Changed
- `settings.js` split into 8 thematic sub-modules
- Pure Node.js ZIP creation (removed Python dependency)
- Manifest strategy: `manifest.base.json` + per-target patch files
- Release procedure simplified with `npm run prerelease`

---

## [2.0.0] - 2026-02-26

### Added
- Chromium (Chrome, Edge, Brave) support with Manifest V3 `side_panel`
- Dual-target build: separate ZIPs for Firefox and Chromium
- AMO-compliant ZIP packaging (forward-slash path separators)
- `ext.js`: unified cross-browser abstraction layer (Firefox `browser.*` / Chromium `chrome.*`)
- esbuild bundling for background service worker (Chromium requirement for ES modules)

### Changed
- Extension ported from Firefox-only to full cross-browser MV3

---

## [1.2.1] - 2026-02-26

### Fixed
- Minor fixes and stability improvements before the 2.0 rewrite

---

## [1.1.7] - 2026-02-25

### Added
- Scientific Validation plugin

---

## [1.1.5] - 2026-02-23

### Fixed
- Manifest permissions and metadata corrections
- Template field legends added to options

---

## [1.1.4] - 2026-02-13

### Fixed
- Obsidian integration fixes
- `utils.js` refactored
- Bionic Reader improved with configurable fixation and rule-based algorithm
- New themes: Sepia and Soft Gray

---

## [1.1.2] - 2026-02-13

### Added
- Obsidian vault export: silent launch (no confirmation dialog)

### Changed
- Sidebar UI cleanup

---

## [1.0.3] - Initial release

### Added
- Web page summarization using Google Gemini API (streaming SSE)
- Firefox sidebar (Manifest V3 `sidebar_action`)
- Bionic reading mode
- Multiple themes (system, light, dark)
- Usage statistics (daily tokens and quota)
- Obsidian export integration
- Plugin system (enable/disable/reorder)

---

## Guidelines for Contributors

- Update `package.json` version when bumping a release
- Add a `## [X.Y.Z] - YYYY-MM-DD` section to this file
- Use `git tag vX.Y.Z` for releases on `main`
- Follow [Conventional Commits](https://www.conventionalcommits.org/)

Commit format: `type(scope): description`
- `feat:` new feature
- `fix:` bug fix
- `security:` security hardening
- `docs:` documentation
- `chore:` maintenance, dependencies
- `test:` test improvements
- `perf:` performance improvements
