# Preparació per a Producció i Open Source — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixa el projecte llest per mergejar a `main`, publicar una release v2.3.0, i obrir el codi font al públic.

**Architecture:** 8 tasques seqüencials: fix d'URLs, neteja de docs, actualització de guies, verificació final.

**Tech Stack:** Node.js 18+, npm, ESLint, GitHub Actions, web-ext

---

### Task 1: Fix `package.json` URL (`ssjSergi` → `xxxaau`)

**Files:**
- Modify: `package.json:8-10`

`package.json` té `ssjSergi` — tots els altres fitxers ja usen `xxxaau`.

- [ ] **Step 1: Editar `package.json` línia 9**

Old:
```json
"url": "https://github.com/ssjSergi/extensio-resumir-contingut.git"
```

New:
```json
"url": "https://github.com/xxxaau/extensio-resumir-contingut.git"
```

- [ ] **Step 2: Verificar que no queden referències a `ssjSergi`**

```bash
Get-ChildItem -Recurse -File | Select-String -Pattern "ssjSergi" | Select-Object Path
```
Expected: cap resultat

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: uniformitza GitHub URL a xxxaau (package.json)"
```

---

### Task 2: Netejar `docs/README.md` — eliminar referències a fitxers inexistents

**Files:**
- Modify: `docs/README.md`

El document referencia 7 fitxers que NO existeixen: `DEVELOPMENT.md`, `SECURITY-POSTURE.md`, `FEATURES.md`, `API-INTEGRATION.md`, `STORAGE-STRATEGY.md`, `BIONIC-READING.md`, `OBSIDIAN-EXPORT.md`. També referencia `TO-DO.md` i `.superpowers/` (ignorats per git).

- [ ] **Step 1: Substituir secció "Directory Organization" (línies 29-40)**

Eliminar `developer/` i `user-guide/` (cap fitxer existeix). Mantenir `internal/`, `architecture/`, `listing/`.

Old:
```
### 👨‍💻 [`developer/`](./developer/)
**Contributing & extension development documentation**.
- **DEVELOPMENT.md** — Local dev environment setup
- **EXTENSION-API.md** — Internal messaging & APIs
- **CONTENT-SCRIPTS.md** — Content script patterns
- **VENDOR-MANAGEMENT.md** — Updating defuddle.js & Readability.js
- **TESTING-STRATEGY.md** — Test architecture & practices

### 👥 [`user-guide/`](./user-guide/)
**User-facing tutorials & feature documentation**.
- **GETTING-STARTED.md** — Installation & first run
- **FEATURES.md** — Feature overview & usage
- **YOUTUBE-SETUP.md** — YouTube transcript setup
- **HN-SETUP.md** — Hacker News setup
- **THEMES.md** — Theme gallery & customization
- **BIONIC-READING.md** — Speed reading mode
- **OBSIDIAN-EXPORT.md** — Markdown export guide
```

New:
```
### 👥 [`user-guide/`](./user-guide/)
**User-facing documentation**.
- **GETTING-STARTED.md** — Installation & first run
```

- [ ] **Step 2: Substituir secció "Which Documentation Should I Read?" (línies 43-51)**

Old:
```
| **Contributor** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | [`developer/DEVELOPMENT.md`](./developer/DEVELOPMENT.md) |
| **Security Auditor** | [`architecture/SECURITY-POSTURE.md`](./architecture/SECURITY-POSTURE.md) | [`../.superpowers/threats/THREAT-MODEL.md`](../.superpowers/threats/THREAT-MODEL.md) |
```

New:
```
| **Contributor** | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) | [`../BUILD.md`](../BUILD.md) |
| **Security Auditor** | [`../SECURITY.md`](../SECURITY.md) | [`../docs/THIRD_PARTY.md`](../docs/THIRD_PARTY.md) |
```

- [ ] **Step 3: Commit**

```bash
git add docs/README.md
git commit -m "docs: neteja docs/README.md — elimina referencies a fitxers inexistents"
```

---

### Task 3: Actualitzar `docs/CONTRIBUTING.md`

**Files:**
- Modify: `docs/CONTRIBUTING.md`

- [ ] **Step 1: Línia 8 — eliminar PowerShell requirement**

Old: `- **PowerShell** 5.1+ (és la plataforma de script de build)`
New: `- **npm** 9+`

- [ ] **Step 2: Línia 55 — actualitzar nombre de tests**

Old: `207 tests`
New: `233+ tests`

- [ ] **Step 3: Línies 84-109 — actualitzar estructura del projecte**

Substituir tot el bloc de l'estructura:

Old:
```
├── sidebar/                 # Interfície (UI principal)
│   ├── sidebar.js          # Orquestrador
│   ├── api.js              # Client Gemini (SSE)
│   ├── content.js          # Extracció de text (YouTube, HN, Readability)
│   ├── ui.js               # Renderitzador DOM
│   ├── cache.js            # Memòria local
│   ├── stats.js            # Estadístiques
│   └── youtube-track-select.js  # Selector de pista YouTube
│
├── options/                # Pàgina de configuració
│   ├── settings.js         # Orquestrador
│   └── settings-*.js       # Mòduls funcionals
│
├── shared/                 # Codi compartit
│   ├── defaults.js         # Prompts per defecte
│   └── models.js           # Model curated array
│
├── tests/                  # Tests unitaris
│   └── *.test.mjs          # Node.js built-in test runner
│
└── scripts/                # Build + release
    ├── build-sidebar-bundle.mjs
    ├── merge-manifest.mjs
    └── ...
```

New:
```
├── sidebar/                 # Interfície (UI principal)
│   ├── sidebar.js          # Orquestrador
│   ├── api.js              # Client Gemini (SSE)
│   ├── content.js          # Extracció de text (YouTube, HN, Readability, PDF)
│   ├── ui.js               # Renderitzador DOM
│   ├── cache.js            # Memòria local
│   ├── history.js          # Historial de resums
│   ├── pdf-viewer.html/js  # Visor PDF personalitzat
│   ├── markmap-native.js   # Renderitzador SVG natiu del mapa conceptual
│   └── conceptmap*.js      # Orquestrador del mapa conceptual
│
├── options/                # Pàgina de configuració
│   ├── settings.js         # Orquestrador
│   └── settings-*.js       # Mòduls funcionals
│
├── shared/                 # Codi compartit
│   ├── defaults.js         # Prompts per defecte
│   ├── models.js           # Model curated array
│   └── content-types.js    # Tipus de contingut centralitzats
│
├── vendor/                 # Llibreries vendoritzades
│   ├── pdf.min.js          # pdf.js (extracció de text PDF)
│   └── pdf.worker.min.js   # Worker pdf.js
│
├── tests/                  # 233+ tests unitaris i E2E
│   └── *.test.mjs          # Node.js built-in test runner
│
└── scripts/                # Build + release (tot Node.js)
    ├── build.mjs           # Build multi-target
    ├── build-sidebar-bundle.mjs
    ├── merge-manifest.mjs
    ├── release.mjs         # Release workflow
    ├── set-mode.mjs        # Dev/Prod mode
    └── pre-release-check.mjs # Auditoria pre-release
```

- [ ] **Step 4: Commit**

```bash
git add docs/CONTRIBUTING.md
git commit -m "docs: actualitza CONTRIBUTING.md (requeriments, tests, estructura)"
```

---

### Task 4: Actualitzar `docs/PRIVACY_POLICY.md`

**Files:**
- Modify: `docs/PRIVACY_POLICY.md`

- [ ] **Step 1: Línia 3 — actualitzar data**

Old: `**Última actualització:** 25 de Febrer de 2026`
New: `**Última actualització:** 29 de Maig de 2026`

- [ ] **Step 2: Línia 13 — corregir storage**

Old: `` Les següents dades s'emmagatzemen exclusivament al teu navegador (`browser.storage.sync` i `browser.storage.local`): ``
New: `` Les següents dades s'emmagatzemen exclusivament al teu navegador (`browser.storage.local`): ``

- [ ] **Step 3: Commit**

```bash
git add docs/PRIVACY_POLICY.md
git commit -m "docs: actualitza PRIVACY_POLICY.md (data i storage.local)"
```

---

### Task 5: Millorar `README.md` per open source

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Línies 121-123 — ampliar secció de contribucions**

Old:
```
## Contribucions

Les contribucions són benvingudes. Llegeix [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md) per saber com participar.
```

New:
```
## Contribucions

Les contribucions són benvingudes! Consulta:

- [Guia de contribució](docs/CONTRIBUTING.md) — com començar
- [Codi de conducta](docs/CODE_OF_CONDUCT.md) — normes de la comunitat
- [Backlog de millores](docs/BACKLOG.md) — funcionalitats pendents
- [Issues](https://github.com/xxxaau/extensio-resumir-contingut/issues) — reporta bugs o demana funcionalitats
- [Discussions](https://github.com/xxxaau/extensio-resumir-contingut/discussions) — preguntes generals

## Reportar bugs

Si trobes un error, obre una [issue](https://github.com/xxxaau/extensio-resumir-contingut/issues/new/choose)
i inclou: navegador/versió, passos per reproduir, comportament real vs. esperat.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: amplia README per open source (contribucions, bugs)"
```

---

### Task 6: Mergejar `feature/pdf-support` a `main`

**Files:** (git operations)

- [ ] **Step 1: Commit a `feature/pdf-support` (si queden canvis sense commit)**

```bash
git add -A
git status  # verificar que tot és correcte
git commit -m "feat(pdf): suport complet per PDFs i preparacio produccio (+docs)"
```

- [ ] **Step 2: Canviar a `main` i mergejar**

```bash
git checkout main
git merge feature/pdf-support --no-ff -m "feat(pdf): merge de suport complet per PDFs i preparacio open source"
```

- [ ] **Step 3: Resoldre conflictes (si n'hi ha)**

```bash
git diff --name-only --diff-filter=U
# Resoldre manualment, després:
git add -A
git commit --no-edit
```

- [ ] **Step 4: Verificació post-merge**

```bash
npm run lint
npm test
```

Expected: 0 warnings, 0 failures

- [ ] **Step 5: Push**

```bash
git push origin main
```

---

### Task 7: Pre-release check complet

**Files:** (cap — execució)

- [ ] **Step 1: Canviar a mode PROD**

```bash
npm run prod
```

- [ ] **Step 2: Build**

```bash
npm run build
```

Expected: ZIPs creats a `build/resumir-contingut-v2.3.0-{firefox,chromium}.zip`

- [ ] **Step 3: Pre-release check**

```bash
npm run prerelease
```

Expected: "✅ Tots els checks passen (13/13)"

Si falla, llegir l'error i corregir-lo abans de continuar.

- [ ] **Step 4: Tornar a mode DEV i netejar**

```bash
npm run dev
Remove-Item -Recurse -Force build/ -ErrorAction SilentlyContinue
```

---

### Task 8: Tag i release (opcional)

**Files:** (git operations)

- [ ] **Step 1: Bump version i release**

```bash
npm version patch --no-git-tag-version
npm run release
git add -A
git commit -m "chore: bump v2.3.0"
git tag v2.3.0
git push origin main --tags
```

Això dispara el workflow de release (`.github/workflows/release.yml`) que crea el GitHub Release amb els ZIPs automàticament.
