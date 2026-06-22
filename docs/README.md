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
- **ARCHITECTURE.md** · **PROJECT-STRUCTURE.md** · **CREAR-PLUGIN.md** ·
  **CONCEPTMAP-FEATURES.md** · **BUILD.md** · **CONTRIBUTING.md** ·
  **DEV-CONTEXT.md** · **STORAGE_ISOLATION.md**

### Seguretat, privadesa i tercers
- **SECURITY.md** · **PRIVACY_POLICY.md** · **THIRD_PARTY.md** · **MODELS-WORKFLOW.md**

### Marca, store i release
- **COMUNICACIO.md** · **MARKETS-COPY.md** · **listing-texts.md** ·
  **CHROME-STORE.md** · **RELEASE-PROCESS.md** · **SUBMISSION-CHECKLIST.md** ·
  **SCREENSHOTS-GUIDE.md**

---

## 🗺️ Which Documentation Should I Read?

| Role | Start Here | Then Read |
|------|-----------|-----------|
| **End User** | [`../README.md`](../README.md) | [`user-guide/GUIA-INICI.md`](./user-guide/GUIA-INICI.md) |
| **Contributor** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | [`../BUILD.md`](../BUILD.md) |
| **Maintainer** | [`../README.md`](../README.md) | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| **Security Auditor** | [`../SECURITY.md`](../SECURITY.md) | [`../docs/THIRD_PARTY.md`](../docs/THIRD_PARTY.md) |

---

## 📝 Documentation Guidelines

- **Keep docs up-to-date** with code changes
- **Link between related docs** for cross-reference
- **Use examples & screenshots** in user-guide docs
- **Document breaking changes** in [`CHANGELOG.md`](./CHANGELOG.md)
- **Cap doc es shippa** als paquets: `docs/` queda fora dels ZIPs de l'extensió

---

**Last Updated**: 2026-05-29
