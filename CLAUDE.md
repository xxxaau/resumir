# CLAUDE.md

Regles vinculants d'aquest repositori per a Claude Code. Per al context tècnic
(arquitectura, comandes, flux de mòduls) vegeu **`docs/DEV-CONTEXT.md`** — no
es duplica aquí per evitar que les dues còpies es desincronitzin.

> **Nota (2026-08-09):** aquest fitxer va existir, es va esborrar el
> 2026-05-13 en un commit de neteja pre-publicació ("Clean repo for public
> release") i el seu contingut tècnic es va migrar a `DEV-CONTEXT.md`, però
> mai es va tornar a crear aquest fitxer amb les regles de procés. Reconstruït
> ara com a part d'una auditoria de gestió de docs/backlog.

## Mode DEV vs PROD

- El repositori es treballa **sempre en mode DEV** (`npm run dev`): manifests
  amb sufix «(DEV)» i icones marcades.
- Els canvis de manifests/icones que genera `npm run dev` / `npm run prod`
  **no es commitegen mai** — és estat local que canvia constantment entre
  sessions. Només es commiteja el mode PROD com a part del pas
  `chore: prepara vX.Y.Z` d'una release real (vegeu `docs/RELEASE-PROCESS.md`).
- Després de tocar codi de `sidebar/*.js` o `background.js`, torna a córrer
  `npm run dev:chromium` perquè `build_chromium_dev/` reflecteixi el codi
  actual (l'Edge de proves no agafa canvis sols).
- **Mai editar `manifest.json` ni `manifest.chromium.json` directament** —
  són generats des de `manifest.base.json` + patches amb
  `npm run manifests:gen`.

## Abans de donar per fet un canvi

- `npm test` i `npm run lint` han de passar (0 warnings).
- Un bug fix porta el seu test de regressió: verifica que **falla sense el
  fix i passa amb el fix** (`git stash` del fitxer font, córrer el test, `git
  stash pop`) abans de donar-lo per bo — no n'hi ha prou que passi amb el fix
  aplicat.
- Commits atòmics: un fix, un commit. Facilita revertir selectivament.

## Gestió de documentació i backlog

- **`docs/BACKLOG.md` només conté idees pendents.** Quan una entrada es
  completa, es treu del fitxer — no s'hi arxiva marcada `✅`. El registre de
  "què s'ha fet" és `docs/CHANGELOG.md` (canvis d'usuari) +
  `docs/LEARNINGS.md` (lliçons tècniques) + l'historial de git. Barrejar fet
  i pendent al mateix fitxer és la manera més ràpida que torni a créixer
  sense control (va passar: el 2026-08-09 el 63% del fitxer eren entrades ja
  tancades).
- **No fixis a mà valors que canvien sols** (nombre de tests, versió actual,
  mides de build) als docs vius. Apunta a la comanda que els genera (`npm
  test`, `package.json`) en lloc d'un número — un número fixat es
  desactualitza i ningú se n'adona fins que algú l'audita.
- Abans de crear o moure un document, consulta **`docs/DOCS-INDEX.md`** (mapa
  de documents vius/històrics/plantilla + taula de "fonts de veritat"). Si
  esborres o mous un fitxer que hi apareix referenciat, actualitza l'índex al
  mateix commit — és exactament el tipus de referència que es converteix en
  un enllaç trencat silenciós si no es fa de seguida.
- `docs/LEARNINGS.md` és un registre viu i **cross-referenciat des d'altres
  docs** (p. ex. `CREAR-PLUGIN.md`) — no es reescriu ni es retalla, només
  s'hi afegeix una entrada nova per sessió (mira la taula de continguts de
  dalt del tot per no duplicar una lliçó ja capturada).

## «Sobre l'extensió» a cada versió

- L'historial de canvis de la configuració (`options/settings.html`, bloc
  `CHANGELOG_START/END`) **s'actualitza a cada versió nova**: es genera de
  `docs/CHANGELOG.md` amb `node scripts/update-changelog-html.mjs`. Les entrades han de
  ser per a l'usuari final; el que és intern es marca `(dev)` i el detall menor `(minor)`.
  `npm test` falla si no està sincronitzat.

## Referències

- Context tècnic i arquitectura: `docs/DEV-CONTEXT.md`
- Procés de release: `docs/RELEASE-PROCESS.md`
- Contribució i estàndards de codi: `docs/CONTRIBUTING.md`
- Mapa de tota la documentació: `docs/DOCS-INDEX.md`
