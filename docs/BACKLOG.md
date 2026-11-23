# Backlog de millores

Llista de millores **pendents**, no prioritzades. Cada entrada inclou context
i criteris d'acceptació mínims.

> **Convenció (des de 2026-08-09):** quan una entrada es completa, es treu
> d'aquest fitxer — no s'hi arxiva marcada com a `✅`. El registre de "què
> s'ha fet" ja existeix i és `docs/CHANGELOG.md` (canvis d'usuari) +
> `docs/LEARNINGS.md` (lliçons tècniques de la sessió) + l'historial de git.
> Mantenir-ho aquí també és feina duplicada que es desactualitza igual de
> ràpid (vegeu la neteja feta avui: 6 de 10 seccions ja estaven 100% fetes,
> el 63% del fitxer).

---

## Propera versió (2.7.4) — pendents de la revisió de la 2.7.3

Origen: revisió independent d'Opus abans de la 2.7.3 (cap bloquejava la release). Dificultat:
**Baixa** (< 1 h, un fitxer), **Mitjana** (diversos fitxers o cal provar en un navegador),
**Alta** (decisió de disseny o risc de regressió). Ordre = prioritat suggerida.

- **Netejar títol i URL de l'historial d'ús antic** (privadesa) — **Mitjana.**
  Les fins a 1.000 entrades de `usageHistory` fetes abans de la 2.7.3 conserven `title` i `url`
  (la 2.7.3 només ho evita en entrades noves). *Enfocament:* migració única en actualitzar
  (`runtime.onInstalled` amb `reason === "update"`, a `background.js`): recórrer `usageHistory`,
  treure `title`/`url` i desar un senyal `usageHistoryScrubbed: true` perquè no es repeteixi; esborrar
  també `dailyStats` orfe. Test amb dades antigues. *Acceptació:* cap entrada conserva títol ni URL;
  les estadístiques de la configuració surten iguals. Després es pot treure la nota de privadesa
  «des de la 2.7.3».
- **Anki «Generar més»: no reintentar errors no recuperables** — **Baixa.**
  `sidebar/anki.js` prova tots els models davant de qualsevol error (també 401/400 i `[012]`), a
  diferència del resum, que només reintenta els recuperables. *Enfocament:* reutilitzar el criteri de
  `sidebar/summary.js` (extreure'l a una funció compartida a `utils.js`). *Acceptació:* un 401 o un
  400 no fa cap segona petició; un 404/429/5xx sí que passa al model següent.
- **PDF sense extensió `.pdf` en obrir la barra** (p. ex. `arxiv.org/pdf/NNNN`) — **Mitjana.**
  A `sidebar/summary.js` (~263-270) la càrrega lleugera només descarta el resultat si `isPdfUrl` (només
  mira l'extensió) diu que és PDF; la detecció per HEAD de l'extracció completa no s'hi aplica.
  *Enfocament:* primer **reproduir-ho al harness Playwright** (no es va poder provar); si és real,
  cridar `looksLikePdfByHead` abans d'acceptar la càrrega lleugera d'una URL https. *Acceptació:*
  test amb una URL sense extensió que respon `application/pdf`.
- **Provar en viu la barra per sota de 300 px** — **Baixa** (és prova, no codi).
  Comprovar que el peu i la barra d'Anki (`position: fixed; left/right: 0`) queden bé amb
  desplaçament horitzontal. Si no, fixar-los a `min-width: 300px`.
- **Provar amb crides reals els models nous** — **Baixa.** Gemma 4 amb un resum real (qualitat, límit
  gratuït), i `gemini-4-carbon/argon/neon` i `3.8/3.6-flash` (només se n'ha comprovat l'existència a
  la doc). Ajustar `rpd` i `contextWindow` de `shared/models.js` amb els valors reals.
- **Excepció del control `?key=` massa àmplia** (`scripts/lib/security-checks.mjs`) — **Baixa.**
  Accepta qualsevol `fetch` de `content.js` amb `youtubei/v1/get_transcript?key=` als 500 caràcters
  següents; un altre `?key=` dins la finestra passaria. *Enfocament:* ancorar l'excepció a la
  crida concreta (regex amb la URL completa) i afegir un cas negatiu al test.
- **Còpia de seguretat amb claus velles** (`options/settings-backup.js`) — **Baixa.** L'exportació
  (`sync.get(null)`) inclou claus `conceptMap*` ja sense ús i la importació diu «s'han ignorat N
  valors». *Enfocament:* filtrar les claus que no són a la llista blanca en exportar.
- **Tests que falten** — **Baixa.** Que la barra (`sidebar/ui.js`) posi «Resumir» primer encara que
  l'ordre desat el posi enmig; i el `padding` dels estats buits (ara el test només comprova
  `min-width`).
- **`AUDIT-TASKS.md`:** arxivar o esborrar — **Baixa.** És a l'arrel (1.401 línies), no surt a
  `docs/DOCS-INDEX.md` i acaba dins del ZIP de codi font. *Enfocament:* moure'l a `docs/historic/`
  (i referenciar-lo a l'índex) o esborrar-lo, ja que totes les tasques estan tancades.
- **Mantenir el defecte i els preus de models** — **Baixa, recurrent.** Quan surti un Flash-Lite nou,
  actualitzar `DEFAULT_MODEL_ID`. Verificar els preus després de l'1/12/2026 (Gemini 4 Carbon/Argon) i
  l'1/1/2027 (Flash 3.8/3.6): ja són al codi els valors anunciats. Els Gemini 2.5 Flash i Pro es
  tanquen l'1/12/2026.

---

## Interfície d'usuari multidioma (i18n)

**Context (2026-05-27):** Actualment tota la interfície d'usuari està en català dur — ~200+ cadenes repartides entre ~18 fitxers (3 HTML + 15 JS). No existeix cap infraestructura d'internacionalització: ni `_locales/`, ni `default_locale` als manifests, ni `chrome.i18n`, ni `__MSG__` als HTML.

L'objectiu és habilitar contribucions externes d'idiomes i preparar l'extensió per a un públic internacional.

**Comportament esperat:**
- L'extensió detecta l'idioma del navegador i mostra la UI en l'idioma corresponent.
- Si l'idioma del navegador no està disponible, es mostra el català (idioma per defecte).
- Totes les cadenes visibles a la UI són traduïbles: sidebar, settings, visor PDF, botons, etiquetes, missatges d'error, menús contextuals, nom/descripció del manifest.
- Els system prompts de l'IA (`shared/defaults.js`) es mantenen en català (instrueixen la IA en català independentment de l'idioma UI) o es tradueixen segons decisió de disseny.

**Abast:**
- `_locales/ca/messages.json` — traducció catalana (completa)
- `_locales/en/messages.json` — traducció anglesa (completa)
- `_locales/es/messages.json` — traducció castellana (opcional, fase 2)

**Evolució tècnica (proposta):**
1. Crear `_locales/{ca,en}/messages.json` amb totes les claus de traducció.
2. Afegir `"default_locale": "ca"` a tots els manifests (`manifest.base.json`, `manifest.chromium.json`, patches).
3. Substituir cadenes en HTML per `__MSG_*__` (sidebar/sidebar.html, options/settings.html, sidebar/pdf-viewer.html).
4. Afegir `ext.i18n.getMessage(key, ...args)` a `ext.js` com a wrapper cross-browser de `chrome.i18n.getMessage`.
5. Substituir cadenes hardcoded als JS per crides a `ext.i18n.getMessage()`.
6. Decidir el tractament dels system prompts de l'IA (mantenir en català o traduir-los).
7. Actualitzar build pipeline per validar que totes les claus `__MSG__` existeixin als messages.json.

**Criteris d'acceptació:**
- [ ] `_locales/` creat amb `ca` i `en` (mínim).
- [ ] `default_locale` present a tots els manifests.
- [ ] Totes les cadenes UI són substituïdes per claus i18n.
- [ ] L'extensió funciona correctament en navegador configurat en català i en anglès.
- [ ] No hi ha regressió visual ni funcional.
- [ ] Les cadenes noves es poden afegir sense tocar codi (només afegir clau als messages.json).
- [ ] Els tests existents continuen passant (`npm test` — vegeu el compte actual a `package.json`/sortida de `npm test`, no el fixis aquí).

**Fitxers probables a modificar:**
- `_locales/ca/messages.json` (nou)
- `_locales/en/messages.json` (nou)
- `ext.js` (wrapper `ext.i18n.getMessage`)
- `sidebar/sidebar.html`, `options/settings.html`, `sidebar/pdf-viewer.html`
- `sidebar/ui.js`, `sidebar/summary.js`, `sidebar/sidebar.js`, `sidebar/history.js`, `sidebar/content.js`, `sidebar/api.js`, `sidebar/pdf-viewer.js`, `sidebar/cache.js`, `background.js`
- `options/settings-options.js`, `options/settings-cache.js`, `options/settings-models.js`
- `shared/content-types.js`
- `manifest.base.json` (+ patches)
- `scripts/pre-release-check.mjs` (validació de claus i18n)

---

## Múltiples proveïdors de models (més enllà de Google Gemini)

**Context (2026-06-19):** Sorgit del testing amb usuaris. Avui l'extensió només
funciona amb Google Gemini i el codi hi està **fortament acoblat, sense cap capa
d'abstracció de proveïdor**:

- `sidebar/api.js` (`callGeminiStream`) té l'endpoint
  (`generativelanguage.googleapis.com/.../streamGenerateContent?alt=sse`) i el
  format del body hardcoded, amb una branca especial per a Gemma vs Gemini.
- El parsing de la resposta assumeix l'SSE de Gemini i `usageMetadata`
  (`promptTokenCount`, etc.) per al comptatge real de tokens.
- `shared/models.js` (`CURATED_MODELS`) assumeix l'estructura i el pricing de Gemini.
- El fallback automàtic de models (`sidebar/summary.js`) assumeix que tots els
  models són de Gemini.

L'objectiu és donar opció de proveïdors **gratuïts i de pagament** (redueix la
fricció de l'API key de Google, que motiva també la guia d'API key de l'usuari).

**Comportament esperat:**
- L'usuari pot triar el proveïdor a Settings i introduir-hi la seva API key.
- Suport per a proveïdors **compatibles amb l'API d'OpenAI** (cobreix molts d'un
  sol cop: OpenRouter, Groq, Together, locals via Ollama/LM Studio, OpenAI…) a
  més de Gemini.
- El comptatge de tokens i el fallback funcionen per proveïdor.

**Abast tècnic estimat:**
- **Crear una abstracció de proveïdor** (interfície comuna: construir petició,
  fer streaming, parsejar resposta i usage) — `sidebar/api.js`.
- Implementacions: Gemini (existent, refactoritzada) + un adaptador
  "OpenAI-compatible".
- `shared/models.js` — model de dades de models per proveïdor (pricing, context,
  límits) i selecció de proveïdor + model.
- `options/settings-models.js` + `settings.html` — selector de proveïdor i gestió
  de múltiples API keys (`storage.sync`).
- `sidebar/summary.js` — fallback conscient del proveïdor.
- Tests — mockejar les respostes streaming de cada format.

**Cost:** ALT. El **primer** proveïdor nou és el car (dissenyar l'abstracció);
afegir-ne més després és incremental.

**Nota (2026-08-09):** ja hi ha un pla d'implementació detallat en dues fases
(refactor de la costura a `sidebar/api.js` sense canvi de comportament, després
adaptador OpenRouter) discutit i aparcat en una sessió anterior — a retrobar
si es reprèn aquesta idea.

**Criteris d'acceptació mínims:**
- [ ] Es pot resumir amb un proveïdor compatible amb OpenAI (a triar) i amb Gemini.
- [ ] El comptatge de tokens i el cost es mostren correctament per al proveïdor actiu.
- [ ] El fallback de models no creua proveïdors de forma incorrecta.
- [ ] No hi ha regressió amb Gemini com a proveïdor per defecte.

---

## Procés i publicació (idees de la revisió d'Opus, 2026-10-14)

Pendent, per prioritat:

- **Provar el ZIP real descomprimit** amb `smoke-e2e.mjs` (ara prova `build_chromium_dev`, sense minificar) i fer que `findChromium` funcioni fora de macOS.
- **Prova de fum de Firefox real** (`scripts/smoke-firefox.mjs`): converteix en script el mètode de BiDi de `LEARNINGS.md` (sidebar, cites, YouTube/HN amb Gemini simulat).
- **Nota de `MARKETS-COPY.md` §5 generada** de la secció `## [X.Y.Z]` del CHANGELOG (la GitHub Release i `npm run release:notes` ja ho fan).
- **Pujada a AMO automatitzada** (`web-ext sign --channel=listed` amb secrets JWT): AMO exigeix el codi font a cada pujada (`npm run release:source`); verificar si l'API permet adjuntar-lo i les notes per al revisor.
- **Seguretat de la cadena:** Dependabot (npm i github-actions) i accions fixades per SHA; `npm audit` també de devDeps (esbuild genera el codi publicat); Node 20 a la matriu de CI (`engines` diu >=20).
- **Build determinista comprovat:** construir dues vegades a CI i comparar SHA-256 (BUILD.md diu «byte-identical»).
- **Captures de botiga automàtiques** a partir del smoke e2e (les 5 de `MARKETS-COPY.md` §6, 1280×800).

