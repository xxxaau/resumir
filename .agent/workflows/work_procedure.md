---
description: Preparar l'entorn de treball (Set Dev Mode)
---

# Procediment de Treball (Dev Mode)

Aquest workflow s'ha d'executar al començament de cada sessió de treball per assegurar que estem treballant amb la identitat visual de desenvolupament (Taronja).

## 1. Activar Mode Desenvolupador

```powershell
// turbo
.\set_dev_mode.ps1 dev
```

## 2. Recarregar Extensió

1. Obrir `about:debugging#/runtime/this-firefox` al navegador.
2. Clicar el botó **"Reload"** a l'extensió "Resumir contingut".

## 3. Verificació

- [ ] Verificar que la icona de l'extensió és TARONJA.
- [ ] Verificar que el nom al manifest diu "Resumir contingut (DEV)".
