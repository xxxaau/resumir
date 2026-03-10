---
description: Publicar nova versió de l'extensió (Standard Release Process)
---


# Procediment de Publicació

Aquest workflow defineix els passos estàndard per publicar una nova versió.

## 1. Validació Prèvia
> [!IMPORTANT]
> **No es poden realitzar `git commit` automàtics de noves funcionalitats o arreglos fins que l'usuari no hagi validat expressament la feature a Firefox**. Els preparatius locals i d'empaquetat s'han de provar sempre primer en mode `dev`.

1. **Netedat de codi i seguretat**

- [ ] Verificar que no hi ha fitxers temporals o privats innecessaris al repositori.
- [ ] Verificar que **cap clau d'API** ni secret s'ha afegit al codi font o al control de versions.

2. Executar testos lògics:

```bash
// turbo
npm test
```

- [ ] Verificar que tots els tests passen en VERD (0 failures).

3. **IMPORTANT: Activar Mode Producció**

```powershell
// turbo
.\set_dev_mode.ps1 prod
```

- [ ] Verificar que la icona torna a ser BLAVA.
- [ ] Verificar que el nom al manifest és "Resumir contingut".

4. Verificar integració crítica (Obsidian):

```bash
// turbo
browser.runtime.reload()
```

- [ ] Carregar extensió a `about:debugging`.
- [ ] Obrir article i clicar botó Obsidian.
- [ ] Verificar que s'obre la nota correctament.

## 1.5. Auditoria Exhaustiva Pre-Release

> [!IMPORTANT]
> Obligatòria a cada nova versió. Seguir el workflow `/pre_release_audit`.

Executar l'auditoria completa que cobreix:
- **AMO Compliance**: eval, codi remot, ofuscació, tercers, manifest
- **Seguretat**: API key, innerHTML, secrets, permisos, world MAIN
- **Accessibilitat**: lang, aria, HTML, keyboard
- **Qualitat de codi**: console.log, typos, claus duplicades, dead code
- **UX**: botons, temes, configuració, extensions, menú contextual
- **Funcionalitat core**: resum, YouTube, HN, deep dive, ciència, cache, streaming
- **Privadesa**: PRIVACY_POLICY.md actualitzada
- **Documentació**: CHANGELOG, README, settings, ROADMAP

- [ ] Tots els ítems de l'auditoria estan ✅ (sense ⚠️ ni 🔴).

## 2. Actualització de Versió

1. **Llista de models de Gemini**: Revisar i actualitzar els models disponibles (`sidebar/api.js` i `options/settings.js`) si s'han llançat noves versions (ex: Gemini 2.5 Flash).
2. **Sincronitzar manifests**: Editar **únicament** `manifest.base.json` (font de veritat):
   - Incrementar la versió
   - Verificar que `name` és "Resumir contingut" (sense "(DEV)")
   - Regenerar els manifests derivats:
   ```powershell
   npm run manifests:gen
   ```
   > [!WARNING]
   > **Mai editar directament** `manifest.json` ni `manifest.chromium.json` — es generen automàticament des de `manifest.base.json` + patches i qualsevol canvi manual es sobreescriurà.

> [!WARNING]
> **CRÍTIC**: Els dos manifests han d'estar sincronitzats en versió. Una diferència pot causar confusió en els usuaris que usen diferents navegadors.

## 3. Documentació

> [!IMPORTANT]
> **Obligatori a cada release:**
> 1. Actualitzar `CHANGELOG.md` amb una nova secció `## [x.y.z] - YYYY-MM-DD` i llistar tots els canvis (Afegit, Corregit, Millorat, Canviat).
> 2. Actualitzar `ROADMAP.md` movent items completats a la secció corresponent.

1. **`CHANGELOG.md`** (OBLIGATORI):
   - Afegir nova secció `## [x.y.z] - YYYY-MM-DD`.
   - Llistar canvis agrupats per: **Afegit**, **Corregit**, **Millorat**, **Canviat**.
2. **`ROADMAP.md`**:
   - Moure items completats i actualitzar estats.
3. Revisar documentació principal:
   - Verificar que el `README.md` continua sent correcte (instal·lació, configuració, noves funcionalitats).
   - Si hi ha canvis en dades o permisos, revisar/actualitzar `PRIVACY_POLICY.md`.

## 4. Generació del Paquet

1. **Neteja prèvia**: Eliminar paquets ZIP antics.

```powershell
// turbo-all
Remove-Item -Path .\*.zip -Force -ErrorAction SilentlyContinue
```

> [!NOTE]
> Les carpetes temporals de build (`build_firefox`, `build_chromium`) les neteja automàticament `build.ps1`.

2. Generar els ZIPs finals amb el build multi-target:

```powershell
// turbo
.\build.ps1 -Target all
```

- [ ] Verificar que s'han creat `resumir-contingut-vX.Y.Z-firefox.zip` i `resumir-contingut-vX.Y.Z-chromium.zip`.

3. **Verificació de contingut dels ZIPs**:
   - **Firefox ZIP**: Ha de contenir `manifest.json`, `ext.js`, `background.js` (NO `background.bundle.js`)
   - **Chromium ZIP**: Ha de contenir `manifest.json` (generat des de `manifest.chromium.json`), `background.bundle.js`

4. **Prova final**: Instal·lar temporalment ambdós ZIPs i verificar funcionalitat bàsica:
   - Firefox: `about:debugging` → "Load Temporary Add-on"
   - Chrome: `chrome://extensions` → "Load unpacked" (descomprimir el ZIP primer)

## 5. Publicació Multi-Plataforma

### 5.1. Repositori Git

1. Actualitzar `ROADMAP.md` (moure items a "Implementat").
2. Fer commit i push:

```bash
git add .
git commit -m "Release vX.Y.Z"
git push origin main
```

3. (Opcional però recomanat) Crear etiqueta git:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

### 5.2. Mozilla Add-ons (Firefox)

4. Pujar `resumir-contingut-vX.Y.Z-firefox.zip` al [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/en-US/developers/).
   - Seleccionar "Upload New Version"
   - Adjuntar el ZIP de Firefox
   - Completar notes de versió (copiar des de `CHANGELOG.md`)
   - Enviar per revisió

- [ ] ZIP de Firefox pujat a AMO
- [ ] Notes de versió afegides

### 5.3. Chrome Web Store (Chromium)

5. Pujar `resumir-contingut-vX.Y.Z-chromium.zip` al [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/).
   - Anar a la pàgina de l'extensió
   - Clicar "Package" → "Upload new package"
   - Adjuntar el ZIP de Chromium
   - Actualitzar "Store listing" si cal (captures, descripció)
   - Completar notes de versió
   - Enviar per revisió

- [ ] ZIP de Chromium pujat a Chrome Web Store
- [ ] Notes de versió afegides
- [ ] Store listing revisat

> [!NOTE]
> El mateix paquet de Chromium funciona per **Chrome**, **Edge**, **Opera**, **Brave** i altres navegadors basats en Chromium. Només cal publicar-lo a Chrome Web Store per arribar a tots aquests navegadors.

### 5.4. Edge Add-ons (Opcional)

6. (Opcional) Pujar també a [Microsoft Edge Add-ons](https://partner.microsoft.com/en-us/dashboard/microsoftedge/):
   - Mateix procés que Chrome Web Store
   - Utilitza el mateix ZIP de Chromium
   - Millora la descoberta per usuaris d'Edge

### 5.5. GitHub Release

7. (Quan el repositori sigui públic / open source) Crear un **GitHub Release**:
   - Utilitzar l'etiqueta `vX.Y.Z`.
   - Copiar el resum de canvis des de `CHANGELOG.md`.
   - Adjuntar **ambdós ZIPs** (Firefox i Chromium) com a assets del release.

---

## 6. Futur: Automatitzacions per a Open Source (CI)

Quan el projecte sigui públic (p. ex. a GitHub), es pot automatitzar part del procés:

- Executar tests i lints automàticament en cada **pull request**.
- A cada **tag `vX.Y.Z`**:
  - Executar tests.
  - Generar automàticament **ambdós ZIPs** (Firefox i Chromium) amb `build.ps1`.
  - Crear/actualitzar un GitHub Release amb els dos ZIPs com a assets.
  - (Opcional) Publicar automàticament a les stores amb APIs corresponents.

Aquest pas no substitueix les comprovacions manuals d'UX (HN, YouTube, Obsidian), però ajuda a garantir la qualitat mínima abans de qualsevol publicació.

---

## 7. Checklist Final de Publicació

- [ ] Versió incrementada en **ambdós** manifests (idèntica)
- [ ] Mode producció activat (`set_dev_mode.ps1 prod`)
- [ ] Auditoria pre-release completada (✅ tots els ítems)
- [ ] `CHANGELOG.md` actualitzat
- [ ] `ROADMAP.md` actualitzat
- [ ] Ambdós ZIPs generats correctament
- [ ] Provat en Firefox amb funcionalitat completa
- [ ] Provat en Chrome/Edge amb funcionalitat completa
- [ ] Git commit i tag creat
- [ ] Publicat a Mozilla Add-ons (Firefox)
- [ ] Publicat a Chrome Web Store (Chromium)
- [ ] (Opcional) GitHub Release creat amb ambdós ZIPs
