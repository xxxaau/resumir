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

- Els fitxers **versionats** (manifests, `icons/`) són **sempre PROD**. El mode
  DEV (nom «(DEV)», gecko.id de dev, icones taronges) es genera en carpetes
  ignorades per git amb `npm run dev` → `build_firefox_dev/` i
  `build_chromium_dev/`. Carrega aquestes carpetes (Firefox: `about:debugging`
  → `build_firefox_dev/manifest.json`; Edge/Chrome: «Carregar desempaquetada»).
- Per això **no hi ha cap estat DEV per commitejar ni per fer stash** abans de
  pujar. Si un fitxer versionat queda en DEV per error, `npm run prod` el
  retorna a PROD.
- Després de tocar codi de `sidebar/*.js` o `background.js`, torna a córrer
  `npm run dev` (o `dev:firefox` / `dev:chromium`) perquè les carpetes dev
  reflecteixin el codi actual (els navegadors no agafen canvis sols).
- **Mai pujar la versió ni crear el tag a mà** (ni a `package.json` ni a
  `manifest.base.json`): sempre `npm version X.Y.Z -m "chore: release v%s"`,
  que via el hook `version` sincronitza manifests i «Sobre l'extensió» dins
  del commit taggejat. La capçalera del CHANGELOG ha de ser exactament
  `## [X.Y.Z] - AAAA-MM-DD` amb la mateixa X.Y.Z (si no, l'entrada no surt a
  «Sobre l'extensió» i cap test ho detecta). Procés complet:
  `docs/RELEASE-PROCESS.md`.
- **Mai editar `manifest.json` ni `manifest.chromium.json` directament** —
  són generats des de `manifest.base.json` + patches amb
  `npm run manifests:gen`.

## Publicació: sempre amb confirmació

- **Mai fer `git push` del tag de versió, ni pujar res a AMO o crear/editar una
  GitHub Release, sense confirmació explícita de l'usuari en aquell moment**, encara
  que s'hagi autoritzat commit+push en altres contexts. Pujar el tag dispara
  `release.yml` i publica; l'aprovació d'una release no s'estén a la següent.
- AMO demana el codi font a cada pujada: `npm run release:source` (o el ZIP adjunt
  a la GitHub Release). Les novetats per enganxar-hi: `npm run release:notes`.

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

## Docs de cara al públic: alinear a cada versió

Abans de cada release, i en acabar qualsevol canvi visible per a l'usuari, revisa que
**quatre superfícies** diguin el mateix que el codi (només `npm test` vigila la 2a):

1. `README.md` (llista de funcionalitats, instal·lació, privadesa, dreceres).
2. «Sobre l'extensió» (`options/settings.html`, regenerat del CHANGELOG).
3. `docs/CHANGELOG.md` (entrada per a l'usuari final de cada canvi).
4. El **web** (`web/src/*.njk`: funcionalitats, privadesa, instal·lació, navegadors) i
   `docs/MARKETS-COPY.md` (What's New i textos de botiga).

Una funcionalitat nova no està acabada fins que surt a aquestes superfícies. Si un
canvi toca privadesa o permisos, també `docs/PRIVACY_POLICY.md`. Checklist a
`docs/RELEASE-PROCESS.md` (secció «PRE-RELEASE»).

## Referències

- Context tècnic i arquitectura: `docs/DEV-CONTEXT.md`
- Procés de release: `docs/RELEASE-PROCESS.md`
- Contribució i estàndards de codi: `docs/CONTRIBUTING.md`
- Mapa de tota la documentació: `docs/DOCS-INDEX.md`
