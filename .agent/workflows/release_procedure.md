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
explorer d:\40361989w\Dev\sergi-firefox-resum\tests\test.html
```

- [ ] Verificar que tots els tests estan en VERD.

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
2. Editar `manifest.json` i incrementar la versió (ex: 1.1.4 -> 1.1.5).
3. Editar `make_zip_v4.py` i actualitzar el nom del fitxer ZIP.

## 3. Documentació

1. Actualitzar `CHANGELOG.md`:
   - Afegir nova secció `## [x.y.z] - YYYY-MM-DD`.
   - Llistar canvis (Afegit, Corregit, Millorat).
2. Actualitzar `options/settings.html`:
   - Afegir entrada a la llista de canvis visual (pestanya "Sobre l'extensió").
3. Revisar documentació principal:
   - Verificar que el `README.md` continua sent correcte (instal·lació, configuració, noves funcionalitats).
   - Si hi ha canvis en dades o permisos, revisar/actualitzar `PRIVACY_POLICY.md`.

## 4. Generació del Paquet

1. Generar el ZIP final signat:

```bash
// turbo
python make_zip_v4.py
```

- [ ] Verificar que s'ha creat el fitxer `.zip` amb la versió correcta.

## 5. Publicació i Repositori

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

4. Pujar el ZIP a [Mozilla Add-ons Developer Hub](https://addons.mozilla.org/en-US/developers/).

5. (Quan el repositori sigui públic / open source) Crear un **GitHub Release**:
   - Utilitzar l'etiqueta `vX.Y.Z`.
   - Copiar el resum de canvis des de `CHANGELOG.md`.
   - Adjuntar el mateix ZIP generat (`make_zip_v4.py`) com a asset del release.

---

## 6. Futur: Automatitzacions per a Open Source (CI)

Quan el projecte sigui públic (p. ex. a GitHub), es pot automatitzar part del procés:

- Executar tests i lints automàticament en cada **pull request**.
- A cada **tag `vX.Y.Z`**:
  - Executar tests.
  - Generar automàticament el ZIP equivalent a `make_zip_v4.py`.
  - Crear/actualitzar un GitHub Release amb el ZIP com a asset.

Aquest pas no substitueix les comprovacions manuals d'UX (HN, YouTube, Obsidian), però ajuda a garantir la qualitat mínima abans de qualsevol publicació.
