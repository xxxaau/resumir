# 📦 SUBMISSION CHECKLIST — Índex Complet de Publicació

> ⚠️ **ESTAT (2026-07-03).** Actualment només es publica a **Firefox Add-ons (AMO)**.
> La distribució per a **Chromium (Chrome/Edge/Brave) es fa via
> [GitHub Releases](https://github.com/xxxaau/resumir/releases)** i la submissió al
> **Chrome Web Store està ajornada** (les seccions CWS d'aquest document es conserven per
> a ús futur). Els números de versió d'exemple (`v2.2.4`) són **il·lustratius**;
> consulta `package.json` / `CHANGELOG.md` per als valors reals. Els **textos i el set de
> captures** vigents són a [`MARKETS-COPY.md`](MARKETS-COPY.md) (font única, només en
> català); si aquest document hi discrepa, mana MARKETS-COPY.md. El flux de release
> (bump, build, push) és a [`RELEASE-PROCESS.md`](RELEASE-PROCESS.md).

Guia executiva de tots els artefactes, documentació i passos preparats per a submissió a Firefox Add-ons (AMO) i Chrome Web Store (CWS).

---

## 📂 ESTRUCTURA DE FITXERS CRÍTICS

### 📖 Documentació de Projecte

| Fitxer | Propòsit | Status |
|--------|----------|--------|
| [README.md](../README.md) | Overview del projecte | ✅ Complet |
| [BUILD.md](BUILD.md) | Instructions build (node, npm, PowerShell) | ✅ Complet |
| [SECURITY.md](SECURITY.md) | Política de seguretat i vulnerabilitats | ✅ Complet |
| [PRIVACY_POLICY.md](PRIVACY_POLICY.md) | Privacy policy (required by AMO/CWS) | ✅ Complet |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Guia contribucions, TDD requirements | ✅ Complet |
| [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) | Código de conducta | ✅ Complet |
| [CHANGELOG.md](CHANGELOG.md) | Historial de versions | ✅ Complet |

### 🎯 Documentació de Submissió

| Fitxer | Propòsit | Status |
|--------|----------|--------|
| **[MARKETS-COPY.md](MARKETS-COPY.md)** | 📝 **TEXTOS PER ALS MARKETS** (CA) + set de captures | ✅ Complet |
| **[SCREENSHOTS-GUIDE.md](SCREENSHOTS-GUIDE.md)** | 📸 **GUIA SCREENSHOTS** (1280×800) | ✅ Complet |
| **[CHROME-STORE.md](CHROME-STORE.md)** | 🌐 **CHROME WEB STORE SUBMISSION** | ✅ Complet |
| **[RELEASE-PROCESS.md](RELEASE-PROCESS.md)** | 🚀 **RELEASE WORKFLOW** (6 fases) | ✅ Complet |

### 🔧 Configuració Producció

| Fitxer | Element | Status |
|--------|---------|--------|
| [package.json](../package.json) | Node.js engines, lint max-warnings 0 | ✅ Actualitzat |
| [manifest.base.json](../manifest.base.json) | Base manifest (CA), CSP, metadata | ✅ Actualitzat |
| [manifest.json](../manifest.json) | Firefox manifest (generated) | ✅ Actualitzat |
| [manifest.chromium.json](../manifest.chromium.json) | Chrome manifest (generated) | ✅ Actualitzat |
| [.github/workflows/ci.yml](../.github/workflows/ci.yml) | CI: lint, tests, build, prerelease, vendors, web-ext lint | ✅ Operacional |

---

## 🎯 CHECKLIST PRE-SUBMISSIÓ (MASTER)

### ✅ Fase 1: Verificacions de Codi

```bash
# 1. Run all checks
npm run check              # lint + test
npm run prerelease         # checks automàtics (scripts/pre-release-check.mjs)
npm audit --omit=dev       # 0 vulnerabilities
```

Expected:
- ✅ ESLint: 0 warnings
- ✅ Tests: 0 failures (el total el dona `npm test`)
- ✅ Pre-release: tots els checks ✅
- ✅ npm audit: 0 vulnerabilities

### ✅ Fase 2: Build & Packaging

```bash
# 2. Switch to production
npm run prod               # Remove DEV label

# 3. Build both targets
npm run build              # Firefox + Chromium ZIPs

# 4. Verify ZIPs
ls -lh build/resumir-contingut-v*.zip
# Expected: < 4 MB cadascun (ho comprova `npm run prerelease`)
```

### ✅ Fase 3: Metadades & Textos

Verificar que tens:

```
✅ MARKETS-COPY.md (CA)
   ├─ Títol, descripció breu i llarga
   ├─ Justificació de permisos
   ├─ Nota de versió (What's New) de la versió actual
   ├─ Text de les 5 captures (§6)
   └─ Categoria i metadades

✅ SCREENSHOTS-GUIDE.md
   ├─ Technical specs (1280×800)
   └─ Com capturar (el set vigent és el de MARKETS-COPY.md §6)

✅ PRIVACY_POLICY.md (linked in copy)

✅ CHANGELOG.md (entrada `## [X.Y.Z]` de la versió actual)
```

### ✅ Fase 4: Documentació de Release

Verificar que tens:

```
✅ CHROME-STORE.md         (7 passos submissió)
✅ RELEASE-PROCESS.md      (6 fases workflow)
✅ BUILD.md (source code requirement per AMO)
✅ SECURITY.md (vulnerabilities policy)
```

---

## 🚀 SUBMISSIÓ STEP-BY-STEP

### FIREFOX ADD-ONS (AMO) — 15 minutes + 30 min review

**Prerequisits:** ✅ All 4 phases above

1. **Accedir a AMO Developer:** https://addons.mozilla.org/developers/
2. **Upload ZIP:** `build/resumir-contingut-vX.Y.Z-firefox.zip`
3. **Omplir Metadades:**
   - **Title:** el `name` del manifest (vegeu MARKETS-COPY.md §1)
   - **Short / full desc:** MARKETS-COPY.md §2 i §3
   - **Permisos:** MARKETS-COPY.md §4
   - **Release notes:** MARKETS-COPY.md §5
   - **Screenshots:** set de MARKETS-COPY.md §6 (1280×800 PNG/JPG)
4. **Submit for Review**
5. **Status:** "Pending Review" (~30 min automated + manual if needed)

**Key Docs:**
- MARKETS-COPY.md (textos)
- SCREENSHOTS-GUIDE.md (captures)
- SECURITY.md (linked)
- PRIVACY_POLICY.md (linked)

---

### CHROME WEB STORE (CWS) — 15 minutes + 1-3 days review

**Prerequisits:** ✅ All 4 phases above

1. **Accedir a CWS Dashboard:** https://chrome.google.com/webstore/developer/dashboard
2. **Upload ZIP:** `build/resumir-contingut-vX.Y.Z-chromium.zip`
3. **Omplir Store Listing:**
   - **Title / descs:** MARKETS-COPY.md (descripció breu ≤ 132 caràcters al CWS)
   - **Screenshots:** set de MARKETS-COPY.md §6 (1280×800 PNG/JPG)
   - **Privacy policy:** Link to full policy
4. **Submit for Review**
5. **Status:** "Pending Review" (1-3 days)

**Key Docs:**
- CHROME-STORE.md (detall step-by-step)
- MARKETS-COPY.md (textos)
- SCREENSHOTS-GUIDE.md (captures)
- PRIVACY_POLICY.md (linked)

---

## 🎯 TEXTUAL ASSETS — QUICK LOOKUP

Tots els textos (títol, descripcions, permisos, nota de versió, text de les captures,
metadades) són a **MARKETS-COPY.md**, seccions §1–§7. No els copiïs aquí: es
desactualitzarien.

---

## 📸 SCREENSHOT ASSETS

### Requisits Tècnics
```
✅ Resolució: 1280×800 pixels exacta
✅ Format: PNG o JPG
✅ Nombre: el set de MARKETS-COPY.md §6 (avui 5; mín 1, màx 5)
✅ Mida: < 5 MB cada

Ordre: el de MARKETS-COPY.md §6.
```

### Com Capturar
```
Veure SCREENSHOTS-GUIDE.md:
- Passos detallats per screenshot
- Tools recomendats (Firefox, Chrome, ShareX)
- Design tips (colores, fonts, spacing)
- Crop a 1280×800 automàticament
```

### Captions
```
Veure MARKETS-COPY.md §6 «Text de les captures de pantalla»
- Només en català
- Ús: Sota imatge al market
```

---

## ✅ CHECKLIST FINAL (COPY & PASTE)

```
PRE-SUBMISSION CHECKLIST:

CODE & BUILD:
[ ] npm run check → 0 errors
[ ] npm run prerelease → tots els checks ✅
[ ] npm audit --omit=dev → 0 vulnerabilities
[ ] npm run build → 2 ZIPs generated
[ ] ZIPs < 4 MB each

METADATES:
[ ] manifest.base.json updated (CSP, metadata)
[ ] manifest.json generated (Firefox)
[ ] manifest.chromium.json generated (Chrome)
[ ] CHANGELOG.md has `## [X.Y.Z]` entry for the current version
[ ] PRIVACY_POLICY.md complete and accessible

MARKETING:
[ ] MARKETS-COPY.md complete (CA) — la seva pròpia llista de verificació
[ ] Títols approved (no typos)
[ ] Descripcions dins dels límits (vegeu MARKETS-COPY.md)
[ ] Release notes ready
[ ] Privacy statements formatted

SCREENSHOTS:
[ ] Captures del set de MARKETS-COPY.md §6 (1280×800)
[ ] All in PNG/JPG format
[ ] All < 5 MB each
[ ] Captions (MARKETS-COPY.md §6)
[ ] Desades fora de git (p. ex. temp/; no es versionen)

DOCUMENTATION:
[ ] BUILD.md accessible (per AMO requirement)
[ ] SECURITY.md complete
[ ] PRIVACY_POLICY.md complete
[ ] CONTRIBUTING.md accessible
[ ] README.md updated

FIREFOX (AMO):
[ ] Account actiu i verificat
[ ] ZIP uploaded
[ ] Metadates omplides
[ ] Textos copiats de MARKETS-COPY.md
[ ] Screenshots uploaded
[ ] Pre-release check passed
[ ] Submit for review

CHROME WEB STORE:
[ ] Developer account created
[ ] ZIP uploaded
[ ] Store listing completed
[ ] Textos (CWS shorter version)
[ ] Screenshots uploaded
[ ] Privacy policy linked
[ ] Submit for review

POST-SUBMISSION:
[ ] Monitor AMO email for approval (30 min - 2h)
[ ] Monitor CWS email for approval (1-3 days)
[ ] Update GitHub when both approved
[ ] Create GitHub release with notes
```

---

## 📞 CONTACTS & RESOURCES

### Firefox Add-ons
- Developer Hub: https://addons.mozilla.org/developers/
- Support: https://support.mozilla.org/
- Contact: sergi@xaudiera.xyz

### Chrome Web Store
- Developer Dashboard: https://chrome.google.com/webstore/developer/dashboard
- Help: https://support.google.com/chromewebstore
- Contact: sergi@xaudiera.xyz

### Project
- GitHub: https://github.com/xxxaau/resumir
- Issues: https://github.com/xxxaau/resumir/issues
- Email: sergi@xaudiera.xyz

---

## 📊 TIMELINE ESTIMATE

| Fase | Durada | Automàtic? |
|------|--------|-----------|
| Code validation | 10 min | ✅ npm scripts |
| Build & ZIP | 5 min | ✅ npm scripts |
| Metadata prep | 15 min | ❌ Manual (1 cop) |
| Screenshot capture | 20 min | ❌ Manual (set de MARKETS-COPY.md §6) |
| Textos translation | 15 min | ❌ Manual (1 cop) |
| **TOTAL PRE-SUBMIT** | **~1 hour** | — |
| AMO review | 30 min - 2 h | ✅ Automàtic |
| CWS review | 1-3 days | ✅ Automàtic |
| **TOTAL TIME-TO-APPROVAL** | **1-3 days** | — |

---

**Document Version:** 1.1  
**Last Updated:** 14 d'octubre de 2026 (alineat amb RELEASE-PROCESS.md i MARKETS-COPY.md per a la v2.7.0)

---

## 📋 QUICK REFERENCE

| What | Where | When |
|------|-------|------|
| **Textos** | MARKETS-COPY.md | Submissió |
| **Screenshots** | SCREENSHOTS-GUIDE.md | Submissió |
| **Release** | RELEASE-PROCESS.md | Post-approval |
| **Chrome details** | CHROME-STORE.md | CWS submission |
| **Build** | BUILD.md | Development |
| **Security** | SECURITY.md | Reference |
| **Privacy** | PRIVACY_POLICY.md | Linked in markets |

