# Chrome Web Store — Submissió i Publicació

Guia completa per a publicar **Resumir contingut** al Chrome Web Store (CWS).

## 📋 Prerequisits

- ✅ Account Google Developer (actiu i verificat)
- ✅ Chrome Web Store Developer Account (€5 one-time registration fee)
- ✅ Build production: `npm run build` → `resumir-contingut-v2.2.4-chromium.zip`
- ✅ All pre-release checks passed: `npm run prerelease` → 16/16 ✅

## 🚀 Passos de Submissió

### Pas 1: Preparar Assets (ONE-TIME)

Descarregar captures de pantalla (1280×800, JPG/PNG):

| Fit | Descripció | Exemple |
|-----|-----------|---------|
| 1 screenshot | Extension main popup (summary generation) | `screenshots/cws-screenshot-1.png` |
| 2 screenshot | Options panel (API key configuration) | `screenshots/cws-screenshot-2.png` |
| 3 screenshot | History panel (cached summaries) | `screenshots/cws-screenshot-3.png` |

**Expected location:** Create a `screenshots/` folder and save as `screenshots/cws-screenshot-*.png` (commit to repo)

### Pas 2: Accedir al Developer Dashboard

1. Anar a [chrome.google.com/webstore/developer/dashboard](https://chrome.google.com/webstore/developer/dashboard)
2. Clicar **Create New Item**
3. Seleccionar el ZIP: `resumir-contingut-v2.2.4-chromium.zip`

### Pas 3: Omplir Metadades

#### Store Listing

```
Title:                Resumir contingut
Short description:    Summarize any webpage with Google Gemini AI
Description:          
  📝 Resumeix pàgines web amb intel·ligència artificial — sense rastreig, sense dades al núvol.
  
  ✨ Funcionalitats:
  • Resum amb IA — un clic per obtenir resum estructurat
  • YouTube i Hacker News — extracció intel·ligent de transcripcions
  • Lectura biònica — mode de lectura ràpida
  • Exporta a Markdown — copia o envia a Obsidian
  • Múltiples temes — sistema, clar, fosc, solarized
  • Privacesa total — tot local, sense servidor propi

  🔒 Seguretat:
  • API key emmagatzemada localment (no sincronitzada)
  • Connexió HTTPS única a Google Gemini API
  • Cap telemetria, cap seguiment
  
  📖 Documentació: https://github.com/xxxaau/extensio-resumir-contingut
  🐛 Reportar bugs: https://github.com/xxxaau/extensio-resumir-contingut/issues

Category:             Productivity
Language:             Català (ca)
Locale:               English, Català, ...
```

#### Detailed Descriptions

**Funcionalitats principals:**
```
✅ Resum instantani amb Gemini AI
✅ Suport YouTube (transcripcions) i Hacker News
✅ Mode de lectura ràpida (biònic)
✅ Exporta a Markdown
✅ Temes personalitzats
✅ Privacesa 100% local
```

**Permisos justificats:**
```
Aquesta extensió requereix:
• activeTab: Accés al contingut de la pestanya actual
• storage: Guardar preferències i configuració
• scripting: Extreure text net de pàgines
• tabs: Obtenir metadades (URL, títol)
• contextMenus: Menú context per resumir
• sidePanel: Panell lateral per resultats

Cap d'aquests permisos es comparteix amb tercers.
```

#### Privacy & Security

```
Política de privacesa:
Aquesta extensió NO:
❌ No recull dades personals
❌ No fa seguiment
❌ No envia dades a servidors (excepte a Gemini API)
❌ No sincronitza dades entre dispositius

Aquesta extensió SÍ:
✅ Emmagatzema API key localment en navegador
✅ Envia contingut de pàgina a Gemini API per resumir
✅ Guarda historial local de resums (opcional)

Per a detalls complets: https://github.com/xxxaau/extensio-resumir-contingut/blob/main/docs/PRIVACY_POLICY.md
```

### Pas 4: Pujar ZIP i Assets

1. Clicar **Upload** i seleccionar `resumir-contingut-v2.2.4-chromium.zip`
2. Clicar **Add images** i pujar 3 screenshots (1280×800 cada una)
3. Esperar validació automàtica (~5 minuts)

### Pas 5: Revisar Permisos Automàtics

CWS analitzarà el manifest i mostrarà:
```
Permissions required:
- storage
- activeTab
- scripting
- tabs
- contextMenus
- sidePanel

Host permissions (required):
- <all_urls> (per a Hacker News fetcher)
```

✅ **VERIFICAR QUE COINCIDEIX AMB manifest.chromium.json**

### Pas 6: Submissió i Revisió

1. Clicar **Submit for Review**
2. Acepta condicions CWS
3. **Status:** "Pending Review" (~1-3 dies laborals)

**Notificacions:** Se't notificará per email quan:
- ✅ Aprovat → Publicat automàticament
- ❌ Rebutjat → Raó + accions de remei

### Pas 7 (Si rebutjat): Corregir i Reenviar

Si AMO rebutja per:

| Error | Solució |
|-------|---------|
| **"API key detected"** | `npm run prerelease` no hauria passat — verificar codi |
| **"Eval() detected"** | Revisar `sidebar/api.js` i `sidebar/content.js` |
| **"Manifest issues"** | Verificar que `manifest.chromium.json` s'ha generat correctament |
| **"Icons missing"** | Confirmar que tots els PNG de `icons/` estan al ZIP |

**Corregir + Reenviar:**
```bash
npm run build
# Clicar Upload nova versió al dashboard
```

---

## 📦 Versionage & Updates

### Per a cada versió nova:

```bash
# 1. Bump versió
npm version minor  # o patch/major

# 2. Build
npm run build

# 3. Upload nova versió al CWS dashboard
# (Mateixa pàgina, clicar "Upload new package")

# 4. Update changelog + release notes
# (CWS mostrarà la nova versió als "What's new")

# 5. Push a GitHub
git push origin main --tags
```

### Changelog a CWS

CWS extraurà automàticament la secció de CHANGELOG.md `## [X.Y.Z]` per a mostrar als usuaris.

---

## 🔄 Problemes Comuns

### "ZIP contains DLL/binary files"
❌ Problema: Build ha inclòs `node_modules/`
✅ Solució: `npm run build` hauria d'excloure node_modules. Verificar `scripts/build.mjs`

### "Manifest version mismatch"
❌ Problema: `manifest.chromium.json` té versió 2.2.3 però package.json té 2.2.4
✅ Solució: `npm run manifests:gen` per sincronitzar

### "Too many permissions"
❌ Problema: `<all_urls>` declarat incorrectament (p. ex. com a permís genèric en lloc de host)
✅ Solució: `<all_urls>` és un host permission requerit; ha d'anar a `host_permissions`

### "Extension crashes on load"
❌ Problema: `background.bundle.js` no s'ha generat correctament
✅ Solució: `npm run build:chromium` i verificar que `background.bundle.js` existeix

---

## ✅ Checklist Pre-Submit

```
[ ] manifest.chromium.json té versió correcta (X.Y.Z)
[ ] BUILD.md instructions executades
[ ] npm run prerelease → 16/16 ✅
[ ] npm run build → 2 ZIPs generats (< 4 MB cada)
[ ] 3 screenshots en format 1280×800 JPG/PNG
[ ] PRIVACY_POLICY.md completada
[ ] CHANGELOG.md té entrada `## [X.Y.Z]`
[ ] No API keys al codi (`npm run prerelease` hauria detectat)
[ ] Permisos justificats al descripció
```

---

## 📞 Suport

- **CWS Help:** [support.google.com/chromewebstore](https://support.google.com/chromewebstore)
- **Project Issues:** [github.com/xxxaau/extensio-resumir-contingut/issues](https://github.com/xxxaau/extensio-resumir-contingut/issues)
- **Contact:** [sergi@xaudiera.xyz](mailto:sergi@xaudiera.xyz)

---

**Última actualització:** 19 de maig de 2026  
**Versió de la guia:** 1.0
