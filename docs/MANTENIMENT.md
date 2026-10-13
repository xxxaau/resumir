# Manteniment recurrent

Coses que s'han de revisar a mà de tant en tant perquè depenen de tercers que canvien
sense avís. Un workflow de GitHub (`.github/workflows/monthly-reminder.yml`) obre cada dia
1 d'hora una issue amb aquest checklist perquè no s'oblidi.

## Mensual — transcripcions i subtítols de YouTube

YouTube canvia sovint com serveix els subtítols; l'extensió n'agafa la transcripció per
**cinc vies**, en cascada (codi a `sidebar/content.js`, bloc «YOUTUBE SPECIAL LOGIC», i
`sidebar/extractors.js`):

| Via | Què fa | Es trenca quan… |
|---|---|---|
| A | Text pre-renderitzat de `ytInitialData` (panell de transcripció) | el panell només porta un `continuationItemRenderer` (ja passa) |
| B | Descàrrega de `timedtext` amb la `baseUrl` de la pista | YouTube exigeix el token `pot` → 200 sense cos (ja passa amb els automàtics) |
| B2 | Reutilitza la petició de `timedtext` del reproductor (amb `pot`) llegida de `performance` | el reproductor deixa de demanar-la, canvia el botó `.ytp-subtitles-button` o el format |
| C | `youtubei/v1/get_transcript` | l'API canvia (avui ja respon 400 «Precondition check failed» a entorns sense sessió) |
| D | Llegeix els segments del DOM després d'obrir el panell | canvien els selectors (`transcript-segment-view-model`, `ytd-transcript-segment-renderer`) |

### Comprovació (10 minuts)
1. `npm run dev:chromium` i recarrega l'extensió (o Firefox via `about:debugging`).
2. Prova **tres vídeos**, cada un en una pestanya real amb sessió normal:
   - un amb **només subtítols automàtics** (p. ex. `https://www.youtube.com/watch?v=AwYYpXfFM9k`);
   - un amb **subtítols manuals** (p. ex. `https://www.youtube.com/watch?v=dQw4w9WgXcQ`);
   - un **sense subtítols** (ha de dir «Vídeo sense transcripció» i resumir la descripció).
3. Clica **Resumir** a cadascun. Comprova que el resum surt, que la primera línia sota
   el resum diu «Basat en N paraules», que els `[m:ss]` són enllaços i que el clic salta
   al moment del vídeo.
4. Si falla, obre la consola de la barra lateral i busca `YouTube Via … failed:` (el missatge
   diu quina via s'ha trencat). Al tab del vídeo, `performance.getEntriesByType('resource')`
   filtrant per `timedtext` mostra què demana el reproductor.
5. `npm run smoke:connectors` (informatiu) revisa la resta de connectors externs.

### Si ha canviat alguna cosa
- Arregla la via afectada a `sidebar/content.js` / `sidebar/extractors.js` (les funcions que
  van al món MAIN han de ser **autocontingudes**: no poden referenciar res de fora).
- Afegeix o ajusta el test a `tests/content.test.mjs` (hi ha un cas per via) i, si cal,
  `tests/connectors.test.mjs`.
- `npm test`, `npm run lint`, `npm run dev:chromium`, i commit atòmic `fix(youtube): …`.
- Afegeix una nota a `docs/LEARNINGS.md` si descobreixes un canvi nou de YouTube.

**Verificació en un navegador automatitzat no serveix:** YouTube bloqueja Playwright/Chromium
headless i les vies B, C i D hi fallen igual (també amb versions antigues de l'extensió).
La prova ha de ser en el teu navegador amb sessió normal.
