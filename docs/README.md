# 📚 Documentation Structure

This directory contains **user-facing, developer, and architectural documentation** for the **Resumir contingut** browser extension.

## 📑 Directory Organization

### 🔐 [`internal/`](./internal/)
**Internal-only documentation** (not shipped to marketplaces).
- **CLAUDE.md** — Claude Copilot context & development decisions
- **STORAGE_ISOLATION.md** — Technical storage architecture

### 🏗️ [`architecture/`](./architecture/)
**System design & technical architecture** for developers.
- **ARCHITECTURE.md** — Overall design & component graph
- **API-INTEGRATION.md** — Gemini API & fallback strategies
- **STORAGE-STRATEGY.md** — Data persistence & sync model
- **SECURITY-POSTURE.md** — CSP, permissions, content isolation

### 👥 [`user-guide/`](./user-guide/)
**User-facing tutorials & feature documentation**.
- **GETTING-STARTED.md** — Installation & first run
- **FEATURES.md** — Feature overview & usage
- **YOUTUBE-SETUP.md** — YouTube transcript setup
- **HN-SETUP.md** — Hacker News setup
- **THEMES.md** — Theme gallery & customization
- **BIONIC-READING.md** — Speed reading mode
- **OBSIDIAN-EXPORT.md** — Markdown export guide

### 👨‍💻 [`developer/`](./developer/)
**Contributing & extension development documentation**.
- **DEVELOPMENT.md** — Local dev environment setup
- **EXTENSION-API.md** — Internal messaging & APIs
- **CONTENT-SCRIPTS.md** — Content script patterns
- **VENDOR-MANAGEMENT.md** — Updating defuddle.js & Readability.js
- **TESTING-STRATEGY.md** — Test architecture & practices

### 🛍️ [`listing/`](./listing/)
**Store listing & marketing content** (for Firefox AMO, Chrome CWS).
- **listing-texts.md** — Marketplace listing copy

---

## 🗺️ Which Documentation Should I Read?

| Role | Start Here | Then Read |
|------|-----------|-----------|
| **End User** | [`user-guide/GETTING-STARTED.md`](./user-guide/GETTING-STARTED.md) | [`user-guide/FEATURES.md`](./user-guide/FEATURES.md) |
| **Contributor** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | [`developer/DEVELOPMENT.md`](./developer/DEVELOPMENT.md) |
| **Maintainer** | [`../README.md`](../README.md) | [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) |
| **Release Manager** | [`../TO-DO.md`](../TO-DO.md) | [`../.superpowers/metrics/RELEASE-CRITERIA.md`](../.superpowers/metrics/RELEASE-CRITERIA.md) |
| **Security Auditor** | [`architecture/SECURITY-POSTURE.md`](./architecture/SECURITY-POSTURE.md) | [`../.superpowers/threats/THREAT-MODEL.md`](../.superpowers/threats/THREAT-MODEL.md) |

---

## 📝 Documentation Guidelines

- **Keep docs up-to-date** with code changes
- **Link between related docs** for cross-reference
- **Use examples & screenshots** in user-guide docs
- **Document breaking changes** in [`../CHANGELOG.md`](../CHANGELOG.md)
- **Internal docs** stay in `internal/` and are NOT shipped to marketplaces

---

**Last Updated**: 2026-05-18
