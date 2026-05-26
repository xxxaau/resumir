# Backlog de millores

Llista de millores pendents, no prioritzades. Cada entrada inclou context i criteris d'acceptació mínims.

---

~~Pestanya de PDF local no renderitza el PDF a Firefox~~ ✅ **Resolt a v2.3.0**

**Context (2026-05-25):** Quan l'usuari selecciona un PDF local mitjançant el botó "Selecciona PDF local", el flux fa:
1. Extreu el text del PDF amb pdf.js (al sidebar).
2. Obre una pestanya de fons amb `blob:` URL per consultar el PDF.
3. El resum es genera directament des del text extret (sense dependre de la pestanya).

**Problema:** Firefox no renderitza `blob:moz-extension://...` URLs al visor PDF nadiu.

**Solució implementada:**
- Pàgina personalitzada `sidebar/pdf-viewer.html` que rep el buffer del PDF via `storage.session` i el renderitza amb pdf.js.
- El buffer es passa com a base64 via `storage.session` amb clau `pdfViewer:<timestamp>`.
- Funciona a Firefox i Chromium sense regressió.

**Criteris d'acceptació (complerts ✅):**
- [x] La pestanya nova mostra el PDF seleccionat de manera llegible a Firefox.
- [x] El resum es genera correctament.
- [x] També funciona a Chromium (no regressió).

**Fitxers modificats:**
- `sidebar/sidebar.js` — flux del "Selecciona PDF local" (envia buffer a storage.session)
- `sidebar/pdf-viewer.html` + `sidebar/pdf-viewer.js` — pàgina nova de visualització
- `tests/e2e-pdf-local.mjs` — test actualitzat per al nou visor

---

~~Persistència de la clau API i historial entre recàrregues de l'extensió~~ ✅ **Resolt a v2.3.0**

**Símptoma observat (2026-05-25):** Quan es recarrega l'extensió (`about:debugging` → Recarrega, o `chrome://extensions` → refresh), sovint cal tornar a introduir la clau API de Gemini. L'historial de resums també sembla afectat de manera intermitent.

**Causes arrel identificades i resoltes:**
1. **Race condition** a la inicialització del sidebar: la migració `sync→local` i la lectura de la clau eren dues IIFE independents. Si l'init llegia abans que la migració copiés, la clau es donava per perduda. **Solució:** fusionar migració dins l'init, seqüencial.
2. **Falta `unlimitedStorage`:** `storage.local` té un límit de ~5-10MB. Amb 500 entrades de cache, omplir-lo feia que `set()` fallés silenciosament, perdent clau i cache. **Solució:** afegir `unlimitedStorage` al manifest.
3. **Pèrdua per remove/re-add i market uninstall:** esperada (storage bucket nou amb extension ID diferent). Limitació documentada a `docs/BUILD.md`.

**Criteris d'acceptació (complerts ✅):**
- [x] Després de recarregar l'extensió a Firefox i Chromium (mode prod instal·lat), la clau API persisteix.
- [x] L'historial de resums (`storage.local`) també persisteix.
- [x] No hi ha pèrdua per quota de storage gràcies a `unlimitedStorage`.
- [x] Si el problema és específic del mode DEV (extension ID canviant), documentar-ho a `docs/BUILD.md` com a limitació coneguda.

**Fitxers modificats:**
- `sidebar/sidebar.js` — migració fusionada dins l'init, mai esborra de `sync` si `local` ja té la clau
- `manifest.json` — afegit `unlimitedStorage`

---

## Historial agrupat per URL amb icones de tipus de contingut

**Context (2026-05-26):** Actualment l'historial del sidebar (`summary_cache:*`) i el de settings (`usageHistory`) són independents i plans. Quan l'usuari fa múltiples accions sobre una mateixa URL (resum + mapa conceptual + aprofundiment + validació), cada acció genera una entrada separada sense cap connexió. El tipus de contingut no es guarda explícitament — només un `type: "lite"|"deep"` binari al usageHistory (sense distingir entre resum, deep dive, validació) i un prefix `<!--conceptmap-->` textual a la cache per als mapes conceptuals.

**Objectiu:** Agrupar tot el contingut generat per a una mateixa URL en una sola entrada, tant al sidebar com a settings, i mostrar icones a la dreta indicant quins tipus de contingut conté.

**Comportament esperat:**
- Si l'usuari fa Resum + Mapa Conceptual + Validació per a la mateixa URL, al historial es veu **una sola fila** amb el títol de l'article i les icones 📝🕸️🔬 a la dreta.
- En clicar l'entrada, es mostra el contingut seleccionable per pestanyes (o menú desplegable) per triar quin tipus veure.
- A settings → Estadístiques: la taula d'historial també agrupa per URL amb icones.
- La llista d'articles es manté plana (no calen filtres nous); les icones informen visualment del contingut de cada entrada.

**Evolució de dades (proposta):**
- Evolucionar `summary_cache:{url}` a estructura multientry:
  ```json
  {
    "url": "https://...",
    "title": "Títol de la pàgina",
    "types": ["summary", "conceptmap", "deepdive", "science"],
    "entries": {
      "summary":    { "content": "...", "model": "...", "timestamp": "..." },
      "conceptmap": { "content": "<!--conceptmap-->...", "model": "...", "timestamp": "..." },
      "deepdive":   { "content": "...", "model": "...", "timestamp": "..." },
      "science":    { "content": "...", "model": "...", "timestamp": "..." }
    },
    "latestTimestamp": "2026-05-26T12:00:00.000Z",
    "version": "2.0"
  }
  ```
- `summary_cache_index` es manté com a llista de claus `summary_cache:{url}`.
- En llegir caches antigues (versió 1.0), convertir a la nova estructura.
- `usageHistory` guanya un camp `type` explícit (`"summary"|"conceptmap"|"deepdive"|"science"` en lloc de `"lite"|"deep"`).
- Compatibilitat enrere amb dades existents.

**Icones proposades:**
- 📝 Resum executiu
- 🕸️ Mapa conceptual
- ➕ Aprofundiment (deep dive)
- 🔬 Validació acadèmica/científica

**Criteris d'acceptació:**
- [ ] En generar un segon tipus de contingut per a la mateixa URL, no es crea una nova entrada sinó que s'afegeix a l'existent.
- [ ] L'entrada agrupada mostra icones a la dreta indicant quins tipus conté.
- [ ] En clicar l'entrada, es pot navegar entre els diferents continguts (pestanyes o selector).
- [ ] El mateix comportament a settings → Estadístiques.
- [ ] Migració silenciosa de dades antigues (versió 1.0 → 2.0) sense pèrdua d'informació.
- [ ] No hi ha regressió en el funcionament actual (TTL, purga, límit d'entrades, cache badge ⚡).
- [ ] `usageHistory` distingeix correctament els 4 tipus de contingut.

**Fitxers probables a modificar:**
- `sidebar/cache.js` (estructura de dades, migració, escriptura, lectura)
- `sidebar/history.js` (renderització agrupada amb icones, navegació per pestanyes)
- `sidebar/sidebar.js` (crida a cache amb paràmetre de tipus, flux de desat)
- `options/settings-stats.js` (lectura del nou `usageHistory`, icones a la taula)
- `options/settings.html` (si calen canvis UI a la taula d'historial)

---

~~Revisar i suprimir `set_dev_mode.ps1` en favor de `node scripts/set-mode.mjs`~~ ✅ **Resolt a v2.3.0**

**Criteris d'acceptació (complerts ✅):**
- [x] Comparació línia per línia dels dos scripts per a mode `dev` i `prod` — són equivalents.
- [x] `node scripts/set-mode.mjs dev` produeix el mateix resultat que `.\set_dev_mode.ps1 dev`
- [x] `node scripts/set-mode.mjs prod` produeix el mateix resultat que `.\set_dev_mode.ps1 prod`
- [x] `set_dev_mode.ps1` eliminat i `docs/BUILD.md` actualitzat.

**Fitxers modificats:**
- `set_dev_mode.ps1` (eliminat)
- `docs/BUILD.md` (actualitzat)

---

~~Migrar `build.ps1` i `release.ps1` a Node.js cross-platform~~ ✅ **Resolt a v2.3.0**

**Criteris d'acceptació (complerts ✅):**
- [x] `scripts/build.mjs` cobreix tots els casos de `build.ps1` (sidebar bundle, exclusió de JS individuals, ZIP output).
- [x] `scripts/build.mjs` és **superior**: inclou `vendor/` directori (pdf.js), elimina `icons/dev/` i `icons/prod/` del paquet, llista completa de sidecars.
- [x] `scripts/release.mjs` creat: backup opcional → set-mode prod → build → restauració del mode original.
- [x] `node scripts/release.mjs --target firefox --no-backup --skip-dev-restore` cobreix tots els flags.
- [x] `build.ps1`, `release.ps1`, `scripts/pwsh-runner.mjs` eliminats.
- [x] `docs/BUILD.md`, `docs/CHANGELOG.md`, `package.json`, `.github/workflows/release.yml` actualitzats.

**Fitxers modificats:**
- `build.ps1` (eliminat)
- `release.ps1` (eliminat)
- `set_dev_mode.ps1` (eliminat)
- `scripts/pwsh-runner.mjs` (eliminat)
- `scripts/release.mjs` (nou)
- `scripts/build.mjs` (referència corregida a `set-mode.mjs`)
- `package.json` (scripts `release*` ara apunten a `scripts/release.mjs`)
- `.github/workflows/release.yml` (node en lloc de pwsh, `build/` prefix als ZIPs)
- `docs/BUILD.md` (actualitzat)
- `docs/CHANGELOG.md` (actualitzat)
