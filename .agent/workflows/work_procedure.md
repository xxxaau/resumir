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

### Firefox

1. Obrir `about:debugging#/runtime/this-firefox` al navegador.
2. Clicar el botó **"Reload"** a l'extensió "Resumir contingut".

### Chrome / Edge (Chromium)

1. Obrir `chrome://extensions` al navegador.
2. Activar **Developer mode** (cantonada superior dreta).
3. Clicar **"Load unpacked"** i seleccionar la carpeta del projecte.
4. Per recarregar: clicar la icona de recàrrega ↻ a l'extensió.

## 4. Verificació

- [ ] Verificar que la icona de l'extensió és TARONJA.
- [ ] Verificar que el nom al manifest diu "Resumir contingut (DEV)".

## 5. Build Multi-Navegador

Per generar els paquets finals:

```powershell
.\build.ps1 -Target all
```

Això genera:
- `resumir-contingut-vX.Y.Z-firefox.zip`
- `resumir-contingut-vX.Y.Z-chromium.zip`
