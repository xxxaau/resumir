# 📚 Documentation Structure

This directory contains **user-facing, developer, and architectural documentation** for the **Resumir** browser extension.

## 📑 Directory Organization

### 🔐 [`internal/`](./internal/)
**Internal-only documentation** (not shipped to marketplaces).
- **CLAUDE.md** — Claude Copilot context & development decisions
- **STORAGE_ISOLATION.md** — Technical storage architecture

### 🏗️ [`architecture/`](./architecture/)
**System design & technical architecture** for developers.
- **ARCHITECTURE.md** — Overall design & component graph

### 👥 [`user-guide/`](./user-guide/)
**User-facing documentation**.
- **GETTING-STARTED.md** — Installation & first run

### 👨‍💻 [`developer/`](./developer/)
**Contributing & extension development documentation**.
*(en construcció — consulta [`../CONTRIBUTING.md`](../CONTRIBUTING.md) i [`../BUILD.md`](../BUILD.md))*

### 🛍️ [`listing/`](./listing/)
**Store listing & marketing content** (for Firefox AMO, Chrome CWS).
- **listing-texts.md** — Marketplace listing copy

---

## 🗺️ Which Documentation Should I Read?

| Role | Start Here | Then Read |
|------|-----------|-----------|
| **End User** | [`../README.md`](../README.md) | [`user-guide/GETTING-STARTED.md`](./user-guide/GETTING-STARTED.md) |
| **Contributor** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | [`../BUILD.md`](../BUILD.md) |
| **Maintainer** | [`../README.md`](../README.md) | [`architecture/ARCHITECTURE.md`](./architecture/ARCHITECTURE.md) |
| **Security Auditor** | [`../SECURITY.md`](../SECURITY.md) | [`../docs/THIRD_PARTY.md`](../docs/THIRD_PARTY.md) |

---

## 📝 Documentation Guidelines

- **Keep docs up-to-date** with code changes
- **Link between related docs** for cross-reference
- **Use examples & screenshots** in user-guide docs
- **Document breaking changes** in [`../CHANGELOG.md`](../CHANGELOG.md)
- **Internal docs** stay in `internal/` and are NOT shipped to marketplaces

---

**Last Updated**: 2026-05-29
