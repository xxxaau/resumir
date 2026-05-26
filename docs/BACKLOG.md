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

## Persistència de la clau API i historial entre recàrregues de l'extensió

**Símptoma observat (2026-05-25):** Quan es recarrega l'extensió (`about:debugging` → Recarrega, o `chrome://extensions` → refresh), sovint cal tornar a introduir la clau API de Gemini. L'historial de resums també sembla afectat de manera intermitent.

**Hipòtesis a investigar:**
- En mode DESENVOLUPAMENT, la recàrrega via `about:debugging` crea un nou extension ID temporal cada cop → `storage.local` queda associat al ID antic i es perd l'accés.
- Possible regressió de la migració `storage.sync` → `storage.local` (v2.2): codi de lectura pot estar mirant la ubicació incorrecta en algun camí.
- Race condition al carregar settings: la UI inicialitza abans que `storage.local.get()` resolgui i mostra el camp buit.
- Caché del bundle del sidebar serveix codi antic que escriu/llegeix d'una clau diferent.

**Criteris d'acceptació:**
- Després de recarregar l'extensió a Firefox i Chromium (mode prod instal·lat), la clau API persisteix.
- L'historial de resums (`storage.local` key `summaryHistory` o equivalent) també persisteix.
- Test reproduïble del cicle save → reload → read.
- Si el problema és específic del mode DEV (extension ID canviant), documentar-ho a `docs/BUILD.md` com a limitació coneguda.

**Fitxers probables a revisar:**
- `options/settings.js` (lectura/escriptura de la clau)
- `shared/storage.js` o equivalent (wrapper de storage si existeix)
- `background.js` (inicialització)
- `sidebar/sidebar.js` (potser llegeix clau per a status)

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

## Revisar i suprimir `set_dev_mode.ps1` en favor de `node scripts/set-mode.mjs`

**Context (2026-05-26):** Existeixen dos scripts per alternar entre mode DEV i PROD:
- `set_dev_mode.ps1` — PowerShell script original
- `node scripts/set-mode.mjs` — port a Node.js cross-platform

Ambdós fan funcionalment el mateix:
1. Actualitzen `manifest.base.json` (name)
2. Actualitzen `manifest.firefox.patch.json` (gecko.id)
3. Regeneren manifests via `scripts/merge-manifest.mjs`
4. Copien icnes de `icons/{dev,prod}/` a `icons/`

**Tasca:** Verificar que `node scripts/set-mode.mjs` cobreix tots els casos de l'antic PowerShell (incloent prod amb patches `.prod.patch.json`) i, si és així, eliminar `set_dev_mode.ps1`.

**Criteris d'acceptació:**
- [ ] Comparació línia per línia dels dos scripts per a mode `dev` i `prod`
- [ ] `node scripts/set-mode.mjs dev` produeix el mateix resultat que `.\set_dev_mode.ps1 dev`
- [ ] `node scripts/set-mode.mjs prod` produeix el mateix resultat que `.\set_dev_mode.ps1 prod`
- [ ] Un cop verificat, eliminar `set_dev_mode.ps1` i referenciar només `node scripts/set-mode.mjs` a `docs/BUILD.md`

**Fitxers afectats:**
- `set_dev_mode.ps1` (eliminar)
- `docs/BUILD.md` (actualitzar referències)
- `scripts/set-mode.mjs` (només revisió, sense canvis)

---

## Migrar `build.ps1` i `release.ps1` a Node.js cross-platform

**Context (2026-05-26):** Un cop verificat i eliminat `set_dev_mode.ps1`, encara queden dos scripts PowerShell al root:
- `build.ps1` (155 línies) — orquestra el build multi-target (Firefox + Chromium). Ja existeix `scripts/build.mjs` com a port a Node.js, però cal verificar que són equivalents i eliminar el `.ps1`.
- `release.ps1` (60 línies) — fa backup → set-mode prod → build → restore mode. No té encara equivalent a Node.js.

**Tasca:**
1. Verificar que `scripts/build.mjs` cobreix tots els casos de `build.ps1` (incloent sidebar bundle, exclusió de JS individuals, ZIP output).
2. Crear `scripts/release.mjs` que repliqui `release.ps1`: backup opcional → set-mode prod → build (delegant a `scripts/build.mjs`) → restauració del mode original.
3. Eliminar `build.ps1` i `release.ps1`.
4. Actualitzar `docs/BUILD.md` i `docs/CHANGELOG.md` amb les noves comandes.

**Criteris d'acceptació:**
- [ ] `node scripts/build.mjs firefox` produeix el mateix ZIP que `.\build.ps1 -Target firefox`
- [ ] `node scripts/build.mjs chromium` produeix el mateix ZIP que `.\build.ps1 -Target chromium`
- [ ] `node scripts/release.mjs` fa backup, build i restore correctament (dry-run opcional)
- [ ] `node scripts/release.mjs --target firefox --no-backup --skip-dev-restore` cobreix els flags de `release.ps1`
- [ ] Tots els `.ps1` eliminats i docs actualitzats

**Fitxers afectats:**
- `build.ps1` (eliminar)
- `release.ps1` (eliminar)
- `scripts/release.mjs` (nou)
- `scripts/build.mjs` (revisió, possiblement sense canvis)
- `docs/BUILD.md` (actualitzar)
- `docs/CHANGELOG.md` (actualitzar)
