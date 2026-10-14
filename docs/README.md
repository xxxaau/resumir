# 📚 Documentation Structure

This directory contains **user-facing, developer, and architectural documentation** for the **Resumir** browser extension.

> 🗂️ **[DOCS-INDEX.md](./DOCS-INDEX.md)** — índex de tots els documents (vius /
> històrics / plantilles), fonts de veritat i valors a mantenir. Consulta'l abans
> d'aplicar canvis per saber quins docs cal actualitzar.

## 📑 Organització

`docs/` és **pla**: tots els documents al primer nivell, excepte les guies d'usuari.
L'inventari complet amb categories i fonts de veritat és a
**[DOCS-INDEX.md](./DOCS-INDEX.md)**.

### 👥 [`user-guide/`](./user-guide/) — documentació d'usuari (català)
- **GUIA-INICI.md** — Instal·lació i primer ús
- **PLUGINS.md** — Què fa cada plugin i quan usar-lo
- **API-KEY-GOOGLE.md** — Com obtenir la clau d'API de Google (pas a pas)

### Desenvolupament i arquitectura
- **DEV-CONTEXT.md** · **ARCHITECTURE.md** · **CREAR-PLUGIN.md** ·
  **CONCEPTMAP-FEATURES.md** · **BUILD.md** · **CONTRIBUTING.md** ·
  **STORAGE_ISOLATION.md**

### Seguretat i privadesa
- **SECURITY.md** · **PRIVACY_POLICY.md**

### Marca, store i release
- **COMUNICACIO.md** · **MARKETS-COPY.md** · **listing-texts.md** ·
  **CHROME-STORE.md** · **RELEASE-PROCESS.md** · **SUBMISSION-CHECKLIST.md** ·
  **SCREENSHOTS-GUIDE.md**

### Manteniment i comunitat
- **MANTENIMENT.md** (revisions recurrents, YouTube cada mes) · **SPONSORS.md** ·
  **CODE_OF_CONDUCT.md**

### Registres i backlog
- **PLA-UI-UX.md** (pla de millora d'interfícies, només pendent) ·
  **BACKLOG.md** (idees pendents, no històric) · **CHANGELOG.md** (canvis
  publicats) · **LEARNINGS.md** (lliçons tècniques sessió a sessió, amb
  taula de continguts al capdamunt)

---

## 🗺️ Which Documentation Should I Read?

| Role | Start Here | Then Read |
|------|-----------|-----------|
| **End User** | [`../README.md`](../README.md) | [`user-guide/GUIA-INICI.md`](./user-guide/GUIA-INICI.md) |
| **Contributor** | [`CONTRIBUTING.md`](./CONTRIBUTING.md) | [`BUILD.md`](./BUILD.md) |
| **Maintainer / Claude Code** | [`../CLAUDE.md`](../CLAUDE.md) | [`DEV-CONTEXT.md`](./DEV-CONTEXT.md), [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **Security Auditor** | [`SECURITY.md`](./SECURITY.md) | [`PRIVACY_POLICY.md`](./PRIVACY_POLICY.md), [`../VENDORS.md`](../VENDORS.md) |

---

## 📝 Documentation Guidelines

- **Keep docs up-to-date** with code changes
- **Link between related docs** for cross-reference
- **Use examples & screenshots** in user-guide docs
- **Document breaking changes** in [`CHANGELOG.md`](./CHANGELOG.md)
- **No fixis a mà valors que canvien sols** (nombre de tests, versió) — apunta
  a la comanda/fitxer que els genera. Vegeu "Valors que es desactualitzen
  sols" a [`DOCS-INDEX.md`](./DOCS-INDEX.md).
- **Cap doc es shippa** als paquets: `docs/` queda fora dels ZIPs de l'extensió

---

**Last Updated**: 2026-08-09
