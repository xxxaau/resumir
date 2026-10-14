# Release Process — Procediment de Publicació

Guia pas a pas per a lançar una nova versió de **Resumir contingut** a producció.

## 📋 Pre-requisits

- ✅ Branca `main` neta (cap canvi sense committejar)
- ✅ Tots els tests passen: `npm run check` (lint + test)
- ✅ Pre-release validation: `npm run prerelease` → tots els checks ✅
- ✅ Access a [GitHub](https://github.com/xxxaau/resumir)
- ✅ Access a [Firefox Add-ons (AMO)](https://addons.mozilla.org/)
- ✅ Access a [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/developer/dashboard)

---

## 🚀 Workflow de Release

### Fase 1: Preparació (30 min)

#### 1.1 Revisar canvis
```bash
# Verificar què canviarà
git log origin/main..HEAD --oneline

# Si cal, agrupar commits
git rebase -i origin/main
```

#### 1.2 Decidir versió (Semantic Versioning)
- **MAJOR** (x.0.0) → Breaking changes (rare)
- **MINOR** (2.x.0) → Features noves (típic)
- **PATCH** (2.2.x) → Bug fixes (freqüent)

**Exemple:** v2.2.4 → v2.3.0 (feature nou)

#### 1.3 Actualitzar CHANGELOG.md
```markdown
## [2.3.0] - 2026-05-20

### Added
- ✨ New feature description
- 🎨 UI improvement

### Fixed
- 🐛 Bug fix description
- 🔧 Minor tweak

### Security
- 🔒 Security hardening description

### Deprecated
- ⚠️ Deprecated API or feature (if any)
```

**Format:** Usa [Keep a Changelog](https://keepachangelog.com)

> **«Sobre l'extensió» s'ha d'actualitzar a CADA versió.** L'historial que veu l'usuari a
> la configuració es genera d'aquest fitxer:
>
> 1. Escriu les entrades pensant en l'usuari (què canvia per a ell, sense jerga).
> 2. Marca amb `(minor)` el que és detall d'usuari poc rellevant i amb `(dev)` el que és
>    intern (CI, npm, refactors): no surt a la configuració.
> 3. Executa `node scripts/update-changelog-html.mjs` i commiteja `options/settings.html`.
>
> `npm test` falla si `settings.html` no reflecteix el CHANGELOG (o no hi surt la versió
> més nova), així que no es pot oblidar.

### Fase 2: Build & Validation (20 min)

#### 2.1 Switch to production mode
```bash
npm run prod

# Verificar que manifest NO té "(DEV)"
grep '"name"' manifest.base.json
# Expected: "name": "Resumir" (no DEV!)
```

> ⚠️ **`npm version` (pas 2.2) avorta si el working tree no està net**
> («Git working directory not clean»). Després d'editar el CHANGELOG (1.3) i de
> `npm run prod`, deixa el tree net amb un commit de **preparació** que inclogui
> el mode PROD i el CHANGELOG:
>
> ```bash
> git commit -am "chore: prepara vX.Y.Z (mode PROD + CHANGELOG)"
> git status   # ha de quedar net abans del bump
> ```
>
> El hook `version` tornarà a fer `git add` del CHANGELOG i regenerarà
> `settings.html` dins del commit del tag; el CHANGELOG ja commitejat aquí no fa
> nosa (git add d'un fitxer sense canvis és no-op).

#### 2.2 Bump versió

> ⚠️ Des de v2.5.0 el sync va al hook **`version`** (NO `postversion`): npm
> l'executa ABANS del commit, així els manifests bumpejats queden DINS del
> commit taggejat. Amb `postversion` quedaven staged fora del tag i el
> workflow de release compilava amb la versió antiga (release v2.5.0 fallida,
> run 27414599296 — es va haver de moure el tag).

```bash
npm version minor -m "chore: release v%s"  # o patch/major

# Aquesta comanda:
# ✅ Actualitza package.json
# ✅ Executa el hook 'version' (sync manifests + CHANGELOG → settings.html + git add)
# ✅ Crea el commit (amb els manifests inclosos) i el git tag vX.Y.Z
```

#### 2.3 Build packages
```bash
npm run build

# Hauria generar a build/ (límit < 4 MB, ho comprova `npm run prerelease`):
# ✅ resumir-contingut-vX.Y.Z-firefox.zip
# ✅ resumir-contingut-vX.Y.Z-chromium.zip
```

#### 2.4 Pre-release validation
```bash
npm run prerelease

# Expected output:
# ✅ Manifests: name sense '(DEV)' ✅
# ✅ Manifests: gecko.id sense 'dev' ✅
# ✅ Manifests: versió sincronitzada ✅
# ✅ ... (tots els checks; el total el dona el mateix script)
#
# Nota: l'auditoria lang="ca" cobreix només l'HTML que s'embala;
# els fixtures de test (tests/) queden exclosos a posta.
```

#### 2.5 Verificacions finals
```bash
# ✅ Tests
npm test

# ✅ Lint (0 warnings)
npm run lint

# ✅ npm audit (0 vulnerabilities)
npm audit --omit=dev
```

### Fase 3: Verificar Commit & Tag (5 min)

```bash
# npm version ja ha creat el commit i el tag. Verifica que el commit
# taggejat conté els manifests bumpejats (la fallada de v2.5.0):
git status                                    # nothing to commit
git show v$(node -p "require('./package.json').version"):manifest.json | grep '"version"'
# Expected: la versió NOVA. Si surt l'antiga, el hook 'version' no ha
# funcionat — mou el tag: git tag -fa vX.Y.Z HEAD && push --force del tag.
```

### Fase 4: Push a GitHub (5 min)

```bash
# Push commits + tags
git push origin main
git push origin vX.Y.Z   # el tag dispara release.yml (build + Release amb ZIPs)

# Verificar a GitHub:
# https://github.com/xxxaau/resumir/releases
```

> ℹ️ El tag ha de coincidir amb la versió de `package.json`: `release.yml` falla si no (és el
> que va passar a la v2.5.0). El mode DEV viu a `build_*_dev/` (ignorades per git), així que
> els fitxers versionats són sempre PROD: no cal cap stash ni hi ha cap hook que bloquegi el push.

### Fase 5: Submissió a Firefox Add-ons (AMO) (10-15 min)

#### 5.1 Accedir a AMO
1. Anar a [addons.mozilla.org/developers](https://addons.mozilla.org/developers/)
2. Seleccionar "Resumir contingut"

#### 5.2 Pujar nova versió
1. Clicar **Upload New Version**
2. Seleccionar `build/resumir-contingut-vX.Y.Z-firefox.zip`
3. Clicar **Continue**

#### 5.3 Revisar automàtic
- **Source code review** (si primer upload): 5-10 dies
- **Automated review** (updates): ~30 minuts
- **Manual review**: ~2-3 hores (si changes criticals)

#### 5.4 Publicació automàtica
Una vegada aprovat, es publica automàticament als usuaris via AMO.

**Status:** Monitoritzar notificacions AMO per email

### Fase 6: Submissió a Chrome Web Store (10-15 min)

> ⚠️ **Procés futur:** avui l'extensió **no és al Chrome Web Store**; Chromium es
> distribueix només amb el ZIP de la GitHub Release (vegeu README). Salta aquesta fase
> fins que es publiqui al CWS.

Veure [CHROME-STORE.md](CHROME-STORE.md) per a detalls complets.

#### 6.1 Accedir al dashboard
1. [chrome.google.com/webstore/developer/dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. Seleccionar "Resumir contingut"

#### 6.2 Pujar nova versió
1. Clicar **Upload new package**
2. Seleccionar `build/resumir-contingut-vX.Y.Z-chromium.zip`

#### 6.3 Actualitzar metadades (si cal)
- Screenshots (si canviat UI)
- Description (si canviat funcionalitats)
- Release notes (copiar a mà de MARKETS-COPY.md; el CWS no llegeix el CHANGELOG)

#### 6.4 Submit for Review
1. Clicar **Submit for review**
2. Acepta termes
3. **Status:** "Pending Review" (~1-3 dies)

---

## ⏱️ Timeline Total

| Fase | Durada | Status |
|------|--------|--------|
| Preparació | 30 min | Manual |
| Build & Validation | 20 min | Automàtic (scripts) |
| Commit & Tag | 5 min | Git |
| GitHub Push | 5 min | Git |
| AMO Submissió | 15 min + 30 min review | Automàtic |
| CWS Submissió | 15 min + 1-3 dies review | Automàtic |
| **TOTAL** | **~1.5 hores + 1-3 dies** | — |

---

## 🔄 Rollback (si necessari)

Si descobreixes un bug crític post-release:

```bash
# 1. Crear hotfix branch
git checkout -b hotfix/critical-bug

# 2. Arreglar bug
# ... editar fitxers, tests, etc ...

# 3. Commit hotfix (afegeix només els fitxers del fix, mai estat DEV ni `git add .`)
git add <fitxers del fix>
git commit -m "fix: Critical bug description"

# 4. Merge a main
git checkout main
git merge hotfix/critical-bug

# 5. Bump PATCH version
npm version patch

# 6. Build + submit (repetir Fase 2-6)
```

---

## 🚨 Errors Comuns

### "manifest.json és vell (versió 2.2.4 quan package.json és 2.3.0)"

**Causa:** el hook `version` no va executar-se  
**Solució:**
```bash
npm run manifests:gen  # Regenerate manifests
git add manifest.json manifest.chromium.json
git commit -m "chore: Sync manifests after version bump"
```

### "AMO rebutja ZIP: 'manifest.json missing'"

**Causa:** `scripts/build.mjs` no ha inclòs `manifest.json` al ZIP  
**Solució:** Revisar `scripts/build.mjs` que inclou `manifest.json` a la llista de fitxers

### "npm version fa dubble commit"

**Causa:** el hook `version` corre dues vegades  
**Solució:** Check `package.json` `version` entry (hauria executar-se UNA sola vegada)

---

## ✅ Release Checklist

```
PRE-RELEASE:
[ ] Main branch net (git status clean)
[ ] Revisar fitxers esborrables abans del bump (p. ex. buidar temp/ —captures compartides—, artefactes de build antics)
[ ] CHANGELOG.md actualitzat i «Sobre l'extensió» regenerada (`node scripts/update-changelog-html.mjs`; `npm test` ho vigila)
[ ] Totes les features tested
[ ] npm run check → 0 errors
[ ] npm audit --omit=dev → 0 vulnerabilities
[ ] (Opcional/recomanat) npm run smoke:connectors → detecta drift dels llocs externs (informatiu, no bloqueja)
[ ] Enllaços públics al web propi: settings.html (guia clau API → https://xxxaau.github.io/resumir/guia/clau-api/), AMO (Pàgina d'inici → el web) i README.

DURING RELEASE:
[ ] npm run prod (dev mode OFF)
[ ] git commit -am "chore: prepara vX.Y.Z (mode PROD + CHANGELOG)" (tree net; npm version avorta si no)
[ ] npm version X.Y.Z (syncs everything)
[ ] npm run build → 2 ZIPs < 4 MB
[ ] npm run prerelease → tots els checks ✅
[ ] git push origin main && git push origin vX.Y.Z (el tag ha de coincidir amb la versió; release.yml ho comprova)

POST-RELEASE:
[ ] Verificar GitHub release created automatically
[ ] Submitir a AMO (Upload new version)
[ ] Submitir a CWS (Upload new package) — només quan es publiqui al CWS (Fase 6)
[ ] Monitorizar email per a approvals
[ ] Update GitHub release description (copy CHANGELOG)
[ ] Regenerar les carpetes dev: npm run dev (build_firefox_dev/ i build_chromium_dev/ a la versió nova; evita carregar codi/versió vells als navegadors).
```

---

## 📞 Contacte & Suport

- **Issues:** [github.com/xxxaau/resumir/issues](https://github.com/xxxaau/resumir/issues)
- **Author:** [sergi@xaudiera.xyz](mailto:sergi@xaudiera.xyz)
- **AMO Help:** [support.mozilla.org](https://support.mozilla.org)
- **CWS Help:** [support.google.com/chromewebstore](https://support.google.com/chromewebstore)

---

**Última actualització:** 14 d'octubre de 2026 (revisat per a la release v2.7.0)  
**Versió:** 1.1  
**Status:** ✅ Production Ready
