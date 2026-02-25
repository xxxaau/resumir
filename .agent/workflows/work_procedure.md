---
description: Preparar l'entorn de treball (Set Dev Mode)
---

# Procediment de Treball (Dev Mode)

Aquest workflow s'ha d'executar al començament de cada sessió de treball per assegurar que estem treballant amb la identitat visual de desenvolupament (Taronja).

## 1. Regles i Bones Pràctiques

> [!IMPORTANT]
> **No es poden realitzar `git commit` automàtics de noves funcionalitats o arreglos fins que l'usuari no hagi validat expressament la feature a Firefox**. Treballa sempre localment i en paral·lel fins tenir llum verda.
>
> **Estil de Textos (UI):** Els títols, enunciats, i qualsevol text adreçat a l'usuari **mai han d'estar en `camelCase`**. Quan implementis noves funcionalitats, assegura't que tots els literals a la interfície estiguin formats orgànicament (ex: `Activar opció` i no `activarOpcio`).

## 2. Activar Mode Desenvolupador

```powershell
// turbo
.\set_dev_mode.ps1 dev
```

## 3. Recarregar Extensió

1. Obrir `about:debugging#/runtime/this-firefox` al navegador.
2. Clicar el botó **"Reload"** a l'extensió "Resumir contingut".

## 4. Verificació

- [ ] Verificar que la icona de l'extensió és TARONJA.
- [ ] Verificar que el nom al manifest diu "Resumir contingut (DEV)".
