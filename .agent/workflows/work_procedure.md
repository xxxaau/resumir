---
description: Preparar l'entorn de treball (Set Dev Mode)
---

# Procediment de Treball (Dev Mode)

// turbo-all

Aquest workflow s'ha d'executar **automàticament** al començament de cada sessió de treball.

## 1. Activar Mode Desenvolupador

```powershell
.\set_dev_mode.ps1 dev
```

## 2. Regles i Bones Pràctiques

> [!IMPORTANT]
> **No es poden realitzar `git commit` automàtics de noves funcionalitats o arreglos fins que l'usuari no hagi validat expressament la feature a Firefox**. Treballa sempre localment i en paral·lel fins tenir llum verda.
>
> **Estil de Textos (UI):** Els títols, enunciats, i qualsevol text adreçat a l'usuari **mai han d'estar en `camelCase`**. Tots els literals a la interfície han d'estar formats orgànicament (ex: `Activar opció` i no `activarOpcio`).

## 3. Recarregar Extensió

> [!IMPORTANT]
> **Provar sempre en ambdós navegadors (Firefox i Chromium)** per garantir compatibilitat multiplataforma.

### Firefox

1. Obrir `about:debugging#/runtime/this-firefox` al navegador.
2. Clicar el botó **"Reload"** a l'extensió "Resumir contingut".
3. Verificar que la sidebar s'obre correctament amb `Ctrl+Shift+Y` o des de l'icona.

### Chrome / Edge (Chromium)

1. Obrir `chrome://extensions` al navegador.
2. Activar **Developer mode** (cantonada superior dreta).
3. Clicar **"Load unpacked"** i seleccionar la carpeta del projecte.
4. Per recarregar: clicar la icona de recàrrega ↻ a l'extensió.
5. Verificar que el side panel s'obre correctament des de l'icona.

> [!TIP]
> La diferència principal entre Firefox i Chromium és que Firefox utilitza `sidebar_action` mentre que Chromium utilitza `side_panel`. Ambdues versions han de funcionar correctament.

## 4. Verificació Multi-Navegador

**Firefox:**
- [ ] Verificar que la icona de l'extensió és TARONJA.
- [ ] Verificar que el nom al manifest diu "Resumir contingut (DEV)".
- [ ] Verificar que `sidebar_action` funciona correctament.
- [ ] Verificar que el menú contextual (menus) funciona.

**Chromium (Chrome/Edge):**
- [ ] Verificar que la icona de l'extensió és TARONJA.
- [ ] Verificar que el nom al manifest.chromium.json diu "Resumir contingut (DEV)".
- [ ] Verificar que `side_panel` funciona correctament.
- [ ] Verificar que el menú contextual (contextMenus) funciona.

> [!NOTE]
> Els dos manifests (`manifest.json` i `manifest.chromium.json`) han d'estar sincronitzats en versió, nom i configuració general. Les úniques diferències han de ser les específiques del navegador: `sidebar_action` vs `side_panel`, `menus` vs `contextMenus`, i `background.scripts` vs `background.service_worker`.

## 5. Build Multi-Navegador

Per generar els paquets finals:

```powershell
.\build.ps1 -Target all
```

Això genera:
- `resumir-contingut-vX.Y.Z-firefox.zip` (usa `manifest.json` amb `sidebar_action`)
- `resumir-contingut-vX.Y.Z-chromium.zip` (usa `manifest.chromium.json` amb `side_panel`)

> [!TIP]
> Per generar només un dels paquets: `.\build.ps1 -Target firefox` o `.\build.ps1 -Target chromium`.
> 
> El build de Chromium crea automàticament `background.bundle.js` concatenant `ext.js` i `background.js` per complir amb els requisits de service worker.

## 6. Test Ràpid de Funcionalitat

Abans de començar a desenvolupar, verificar funcionalitat bàsica en ambdós navegadors:

- [ ] **Firefox**: Obrir sidebar, generar un resum d'una pàgina web
- [ ] **Chromium**: Obrir side panel, generar un resum d'una pàgina web
- [ ] Verificar que el menú contextual "Resumir text seleccionat" funciona en ambdós
- [ ] Verificar que les configuracions es desen correctament en ambdós
