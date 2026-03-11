---
description: Publicar nova versió de l'extensió (Standard Release Process)
---

# Procediment de Publicació

> [!IMPORTANT]
> **No es poden realitzar `git commit` automàtics de noves funcionalitats fins que l'usuari no hagi validat la feature a Firefox**.

---

## 1. Preparar

### 1.1. Versió i manifests

1. Editar **únicament** `manifest.base.json` (font de veritat):
   - Incrementar la versió
   - Verificar que `name` és "Resumir contingut" (sense "(DEV)")
2. Activar mode producció i regenerar manifests derivats:

```powershell
.\set_dev_mode.ps1 prod
npm run manifests:gen
```

> [!WARNING]
> **Mai editar directament** `manifest.json` ni `manifest.chromium.json` — es generen des de `manifest.base.json` + patches.

### 1.2. Auditoria automàtica

```bash
npm run prerelease
```

- [ ] Tots els checks passen ✅ (0 errors)

Si algun check falla, corregir abans de continuar. Els checks manuals que no cobreix l'script (UX, funcionalitat en navegadors reals) estan al workflow `/pre_release_audit`.

### 1.3. Models de l'API

- [ ] Revisar `shared/models.js`: verificar que els IDs de `CURATED_MODELS` existeixen i funcionen
- [ ] Si algun model ha canviat d'ID a l'API de Google → actualitzar abans de publicar

### 1.4. Documentació

- [ ] `CHANGELOG.md` — afegir secció `## [x.y.z] - YYYY-MM-DD` amb canvis agrupats (Afegit, Corregit, Millorat, Canviat)
- [ ] `ROADMAP.md` — moure items completats a la secció corresponent
- [ ] `README.md` — verificar que reflecteix funcionalitats actuals
- [ ] `settings.html` (tab "Sobre") — actualitzar llista de canvis visual si cal
- [ ] `PRIVACY_POLICY.md` — actualitzar si hi ha nous permisos o connexions externes

---

## 2. Empaquetar

```powershell
Remove-Item -Path .\*.zip -Force -ErrorAction SilentlyContinue
.\build.ps1 -Target all
```

- [ ] `resumir-contingut-vX.Y.Z-firefox.zip` generat ✅
- [ ] `resumir-contingut-vX.Y.Z-chromium.zip` generat ✅

**Verificació de contingut:**
- Firefox ZIP: conté `manifest.json`, `ext.js`, `background.js`, `sidebar.bundle.js` — **no** `background.bundle.js`
- Chromium ZIP: conté `manifest.json` (des de `manifest.chromium.json`), `background.bundle.js`, `sidebar.bundle.js`

**Prova final en navegadors reals:**
- [ ] Firefox: `about:debugging` → "Load Temporary Add-on" → verificar funcionalitat bàsica
- [ ] Chrome/Edge: `chrome://extensions` → "Load unpacked" (descomprimir ZIP primer) → verificar funcionalitat bàsica

---

## 3. Publicar

### 3.1. Git

```bash
git add .
git commit -m "release: vX.Y.Z — <resum breu>"
git tag vX.Y.Z
git push origin main --tags
```

### 3.2. Mozilla Add-ons (Firefox)

- Pujar `resumir-contingut-vX.Y.Z-firefox.zip` al [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/en-US/developers/)
- Seleccionar "Upload New Version" → adjuntar ZIP → afegir notes de versió (des de `CHANGELOG.md`) → enviar per revisió

- [ ] ZIP de Firefox pujat ✅
- [ ] Notes de versió afegides ✅

### 3.3. Chrome Web Store (Chromium)

- Pujar `resumir-contingut-vX.Y.Z-chromium.zip` al [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
- "Package" → "Upload new package" → adjuntar ZIP → actualitzar store listing si cal → enviar per revisió

- [ ] ZIP de Chromium pujat ✅
- [ ] Notes de versió afegides ✅

> [!NOTE]
> El mateix paquet Chromium cobreix Chrome, Edge, Opera i Brave. No cal publicar-lo per separat a cada navegador.

### 3.4. GitHub Release (opcional)

```bash
gh release create vX.Y.Z resumir-contingut-vX.Y.Z-firefox.zip resumir-contingut-vX.Y.Z-chromium.zip \
  --title "vX.Y.Z" --notes-file <(grep -A50 "## \[X.Y.Z\]" CHANGELOG.md | head -50)
```

---

## Checklist final

- [ ] Mode producció activat (`set_dev_mode.ps1 prod`)
- [ ] `npm run prerelease` → tots els checks ✅
- [ ] Versió incrementada i sincronitzada en tots els manifests
- [ ] `CHANGELOG.md` i `ROADMAP.md` actualitzats
- [ ] Ambdós ZIPs generats i provats en navegadors reals
- [ ] Git commit, tag i push
- [ ] Publicat a Mozilla Add-ons
- [ ] Publicat a Chrome Web Store
