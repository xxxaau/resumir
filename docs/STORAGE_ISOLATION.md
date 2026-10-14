# Solució: Protecció de Dades en Canvi Dev/Prod

## El Problema

Quan instal·les per accident la versió de **producció** (PROD) en local sobrescrivint la versió de **desenvolupament** (DEV), l'extensió perd:
- Historial de résums
- Estadística d'ús
- Configuració personalitzada

Esto passa perquè les dues versions en local comparteixen el mateixa namespace de storage al navegador.

## La Solució

S'ha implementat un sistema que **aïlla el storage per navigator i mode**:

### Firefox ✓ (Ja Function)
- **DEV**: `extension_id = sergi.dev@xaudiera.xyz`  
- **PROD**: `extension_id = sergi@xaudiera.xyz`

Cada versió té un storage **completament aïllat**.

### Chromium
- Els patches de Chromium **no porten cap `key`**: l'ID d'una extensió desempaquetada depèn de la carpeta carregada.
- **DEV**: `build_chromium_dev/` (`npm run dev:chromium`) → ID propi
- **PROD**: el ZIP de GitHub Releases descomprimit en una altra carpeta → un altre ID

Cada carpeta té el seu storage; si tornes a carregar des d'una carpeta diferent, l'ID (i el storage) canvien.

## Com Usar

### 1️⃣ Canviar Mode (Sense Perdre Dades)

**Abans de canviar de DEV a PROD (o viceversa):**

```powershell
# Fer backup de les dades actuals
node scripts/backup-extension-data.mjs firefox dev   # Si estàs en DEV

# Después canviar de mode
npm run prod

# L'extensió tindrà storage nou i aïllat
```

### 2️⃣ Fer Backup Manual

```powershell
# Menu interactivo
node scripts/backup-extension-data.mjs

# O directamente
node scripts/backup-extension-data.mjs firefox dev
node scripts/backup-extension-data.mjs chromium prod
```

### 3️⃣ Restaurar Dades

```powershell
# Veure backups disponibles
node scripts/backup-extension-data.mjs list

# Restaurar específic
node scripts/backup-extension-data.mjs restore firefox-dev-2026-04-01T15-30-45 firefox
```

## Estructura de Storage

**Firefox:**
- **DEV**: `Resumir (DEV)` + ID `sergi.dev@xaudiera.xyz` → Storage aïllat
- **PROD**: `Resumir` + ID `sergi@xaudiera.xyz` → Storage aïllat

**Chromium:**
- **DEV**: carpeta `build_chromium_dev/` → Storage aïllat
- **PROD**: carpeta del ZIP de release → Storage aïllat

## Recomanacions

✅ **DO:**
1. Usa Firefox/Chromium **separats** per DEV i PROD (ex: Firefox per DEV, Chrome per PROD)
2. Fes backup **ANTES** de canviar mode
3. Posa't etiquetes als navegadors perquè no et confonguis

❌ **DON'T:**
1. No instal·lis DEV i PROD al mateixa navegador (ara ja estan isolats, però és confús)
2. No borris la carpeta `.backups` sense revisar els backups

## Resum Tècnic

- **manifest.firefox.patch.json** (DEV) - Extension ID dev: `sergi.dev@xaudiera.xyz`
- **manifest.firefox.prod.patch.json** (PROD) - Extension ID prod: `sergi@xaudiera.xyz`
- **manifest.chromium.patch.json** (DEV) / **manifest.chromium.prod.patch.json** (PROD) - Sense `key`; l'aïllament ve de la carpeta carregada
- **npm run dev / npm run prod** (`scripts/set-mode.mjs`) - Copia els parches correctes según el mode
- **scripts/backup-extension-data.mjs** - Tool de backup/restore

---

**Aprovat**: 2026-04-01 | **Versió**: 2.1.0
