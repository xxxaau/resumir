# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- (work in progress on `develop` branch)

## [2.2.4] - 2025-04-28

### Added
- Bionic reading mode with configurable fixation
- YouTube transcript extraction (prerendered + API fallback)
- Hacker News article fetching with intelligent fallback
- Streaming responses (SSE) with real-time timer
- Multiple themes (system, light, dark, solarized, gray)
- Daily usage statistics and token tracking
- Obsidian vault export integration
- Plugin system (enable/disable/reorder functionality)

### Security
- Optional `<all_urls>` permissions (user consent at runtime)
- Content Security Policy: `script-src 'self'`, `object-src 'self'`, `connect-src` limited
- SSRF protection: IPv4/IPv6 private ranges, CGNAT, link-local, multicast blocked
- Content-Type validation for external fetches
- No API keys in URLs (header-based only)

### Changed
- YouTube refactor: Step 1 (MAIN world extraction) + Step 2 (API fallback)
- Sidebar bundled for Chromium (esbuild)
- Manifest v3 dual-target (Firefox + Chromium)

## [2.2.3] - Previous

See `git log develop` for detailed commit history.

---

## Guidelines for Contributors

- Update `package.json` version when bumping release
- Update this file with `## [X.Y.Z] - YYYY-MM-DD` section
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
