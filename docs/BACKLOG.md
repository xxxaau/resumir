# Backlog de millores

Llista de millores pendents, no prioritzades. Cada entrada inclou context i criteris d'acceptació mínims.

---

## Pestanya de PDF local no renderitza el PDF a Firefox

**Context (2026-05-25):** Quan l'usuari selecciona un PDF local mitjançant el botó "Selecciona PDF local", el flux fa:
1. Extreu el text del PDF amb pdf.js (al sidebar).
2. Obre una pestanya de fons amb `blob:` URL per consultar el PDF.
3. El resum es genera directament des del text extret (sense dependre de la pestanya).

**Problema:** Firefox no renderitza `blob:moz-extension://...` URLs al visor PDF nadiu. La pestanya s'obre però es mostra en blanc. A Chromium sí que funciona.

**Alternatives provades:**
- `data:` URL → massa gran per a PDFs >750KB, i Firefox pot tenir límits de llargada d'URL.
- `blob:` URL + `active:true` → la pestanya s'activa però el PDF segueix sense renderitzar-se.

**Possibles solucions a investigar:**
- Pàgina d'extensió personalitzada que rebi el buffer del PDF i el renderitzi amb pdf.js (ja vendoritzat a `vendor/pdf.min.js`).
  - Calcular: crear `sidebar/pdf-viewer.html`, passar dades via `ext.storage.session` o query parameter.
- `ext.downloads.download` amb `saveAs: false` + `open: true` — obre el PDF amb el visor extern del SO. Requereix permís `"downloads"` al manifest.
- Utilitzar `URL.createObjectURL` dins d'un `<iframe>` o `<embed>` a la pròpia pàgina del sidebar (en lloc d'una pestanya nova).

**Criteris d'acceptació:**
- La pestanya nova (o mecanisme alternatiu) mostra el PDF seleccionat de manera llegible a Firefox.
- El resum es genera correctament (ja funciona).
- També funciona a Chromium (no regressió).

**Fitxers probables a modificar:**
- `sidebar/sidebar.js` (flux del "Selecciona PDF local")
- Possible: `sidebar/pdf-viewer.html` + `sidebar/pdf-viewer.js` (pàgina nova)

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
