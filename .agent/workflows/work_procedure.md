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

1. Obrir `about:debugging#/runtime/this-firefox` al navegador.
2. Clicar el botó **"Reload"** a l'extensió "Resumir contingut".

## 4. Verificació

- [ ] Verificar que la icona de l'extensió és TARONJA.
- [ ] Verificar que el nom al manifest diu "Resumir contingut (DEV)".
