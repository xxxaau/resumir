# Revisió i Pla de Millores — Extensió Resumir Contingut

**Data:** 2026-03-27
**Versió base:** 2.1.0
**Metodologia:** Matriu Urgència × Dificultat (4 quadrants)

---

## Context

Extensió de navegador (Firefox + Chromium, MV3) que resumeix pàgines web usant l'API de Gemini. Arquitectura modular: `sidebar/` (8 mòduls), `options/` (8 sub-mòduls), `shared/models.js`, `ext.js` (wrapper cross-browser), `background.js`. Build pipeline amb esbuild + PowerShell. 56 tests unitaris amb Node.js built-in runner.

---

## Enfocament

**Matriu Urgència × Dificultat** — 4 quadrants:
- **Q1** (Alta urgència / Fàcil): corregir ara, cost baix, impacte directe
- **Q2** (Alta urgència / Difícil): requereix sprint dedicat, risc d'introduir regressions
- **Q3** (Baixa urgència / Fàcil): quick wins en moments lliures
- **Q4** (Baixa urgència / Difícil): backlog a llarg termini

---

## Q1 — Alta urgència / Fàcil

### B1 — Inconsistència del model per defecte

**Fitxers:** `sidebar.js:285`, `summary.js:65`
**Problema:** Dos fallbacks hardcodejats amb models diferents:
- `sidebar.js`: `"gemini-2.0-flash"`
- `summary.js`: `"gemini-2.5-flash"`

Si l'usuari no ha guardat mai cap model, el comportament varia segons quin codi s'executa primer.

**Solució:** Extreure una constant `DEFAULT_MODEL_ID` a `shared/models.js` i referenciar-la des d'ambdós fitxers.

**Dificultat:** Trivial (1 constant + 2 referències)
**Risc:** Mínim

---

### B2 — Codi duplicat al listener `storage.onChanged`

**Fitxer:** `sidebar.js:79-87`
**Problema:** Les dues branques del condicional sobre `changes.apiKey` executen exactament el mateix (`window.location.reload()`). El `if/else` no té cap efecte real.

```js
if (changes.apiKey.newValue) {
    window.location.reload(); // mateixa acció
} else {
    window.location.reload(); // mateixa acció
}
```

**Solució:** Eliminar el condicional, deixar una sola crida a `window.location.reload()`.

**Dificultat:** Trivial (eliminar 4 línies)
**Risc:** Cap

---

### B3 — Token limit massa conservador

**Fitxer:** `summary.js:189-193`
**Problema:** `safeLimit = 8000` tokens (~28.000 caràcters) trunca articles llargs. Gemini 2.5 Flash suporta fins a 1.000.000 tokens de context. Articles científics, reportatges llargs o transcripcions de YouTube queden retallats innecessàriament.

**Solució:** Elevar el límit per defecte a 100.000 tokens (350.000 caràcters) com a mínim segur pràctic. Idealment, afegir un camp `contextWindow` a `CURATED_MODELS` per aplicar el límit correcte per model.

**Dificultat:** Fàcil (canvi de constant + opcionals)
**Risc:** Baix (pot augmentar cost per consulta si l'usuari tria models de pagament)

---

### B4 — `background.bundle.js` commitejat al repositori

**Fitxer:** `background.bundle.js` (arrel), `.gitignore`
**Problema:** Fitxer generat per esbuild present al repo. Causa diffs espuris en cada build, infla l'historial de git.

**Solució:** Afegir `background.bundle.js` al `.gitignore`. Verificar que el CI el genera correctament abans de fer el ZIP.

**Dificultat:** Trivial (1 línia al .gitignore)
**Risc:** Cal confirmar que el CI fa el build abans de l'empaquetament

---

### B5 — `EUR_RATE` hardcoded sense context

**Fitxer:** `api.js:5`
**Problema:** `const EUR_RATE = 0.92;` sense data, font ni forma d'actualitzar. Els preus mostrats a l'usuari poden ser inexactes.

**Solució:** Moure a `shared/models.js` com a constant documentada, o eliminar la conversió i publicar els preus directament en EUR a `CURATED_MODELS` (que ara estan en USD).

**Dificultat:** Fàcil
**Risc:** Mínim

---

## Q2 — Alta urgència / Difícil

### A1 — Fallback de quota aplica a TOTS els models curats

**Fitxer:** `summary.js:198`
**Problema:**
```js
const modelsToTry = [...new Set([modelName, ...CURATED_MODELS.map(m => m.id)])];
```
Quan s'esgota la quota, l'extensió prova tots els models curats en ordre, incloent `gemini-2.5-pro` (50 RPD/dia, tarifa de pagament). L'usuari pot consumir quota cara sense saber-ho.

**Solució:** Construir `modelsToTry` a partir dels favorits de l'usuari, filtrats per un criteri de "model de fallback" (ex: models amb `rpd > 500` o models marcats explícitament com a fallback a `CURATED_MODELS`). Afegir un camp `fallback: true` als models aptes per a fallback automàtic.

**Dificultat:** Mitjana — cal modificar `CURATED_MODELS`, la lògica de fallback i els tests associats
**Risc:** Pot canviar el comportament quan tots els favorits estan exhaurits

---

### A2 — La caché mai expira

**Fitxer:** `cache.js`
**Problema:** Les entrades `summary_cache:${url}` s'emmagatzemen indefinidament. Amb el temps, `storage.local` pot arribar al límit de l'API (~5-10 MB). No hi ha forma automàtica de purgar entrades velles.

**Solució:**
1. Afegir un TTL per defecte (ex: 30 dies) a `saveSummaryCache`.
2. Afegir una funció `purgeStaleCacheEntries()` que elimini entrades amb `timestamp` més vell que el TTL.
3. Cridar-la en `onInstalled` o via un missatge periòdic des del background.
4. Exposar el TTL com a opció configurable a `settings.html`.

**Dificultat:** Mitjana — requereix enumerar claus de `storage.local` (no hi ha API directa per a prefixos) i gestionar la purga de forma segura
**Risc:** Moderat — una purga agressiva pot eliminar resums que l'usuari volgués conservar

---

### A3 — Re-parse complet del DOM a cada chunk de streaming

**Fitxer:** `ui.js:253`, cridat des de `summary.js:211`
**Problema:** Durant el streaming, `formatTextToFragment(currentMetadata.summary, ...)` re-parseja i re-renderitza el DOM complet del text acumulat cada 100ms. Per resums llargs (>5KB), el cost creix linealment amb cada chunk rebut.

**Solució:** Separar la fase de streaming de la fase de renderitzat final:
1. Durant el streaming, afegir chunks com a `textContent` pur en un node temporal (sense parse Markdown).
2. Un cop el stream acaba (`success = true`), fer el parse complet i renderitzar el Markdown.

**Dificultat:** Mitjana-alta — cal refactoritzar `startSummary` i el callback `onChunk`, i assegurar que la UX segueixi sent fluida
**Risc:** Moderat — canvi de comportament visible per l'usuari durant el streaming

---

## Q3 — Baixa urgència / Fàcil

### C1 — Lògica de migració d'ordre hardcoded

**Fitxer:** `ui.js:57-65`
**Problema:** Tres strings JSON hardcodejats detecten ordres antics per migrar-los. Cada canvi futur del default afegirà una nova branca.

**Solució:** Afegir un camp `orderVersion` a `storage.sync`. Migrar per versió numèrica en lloc de comparar strings JSON.

---

### C2 — Tests per a `formatTextToFragment` i `formatBionicText`

**Fitxer:** `ui.js:224, 253` — sense cobertura de tests
**Problema:** Funcions pures que transformen text → fragment DOM. Canvis accidentals al parser Markdown o a la lògica biònica no es detectarien.

**Solució:** Afegir `tests/ui.test.mjs` amb casos per a: headers, llistes, negreta, links Markdown, links bare, DOIs, lectura biònica amb fixació variable.

---

### C3 — `Readability.js` com a fitxer venedor manual (91KB)

**Fitxer:** `Readability.js` (arrel)
**Problema:** Versió desconeguda, sense npm, sense forma automàtica d'actualitzar. Infla el repo.

**Solució:** Afegir `@mozilla/readability` com a `devDependency` i copiar el fitxer via script de build, o documentar explícitament la versió al `THIRD_PARTY.md` i al build script.

---

### C4 — Dos reads seqüencials a `saveUsageStats`

**Fitxer:** `cache.js:46, 65`
**Problema:**
```js
const stats = await ext.storage.local.get("stats");
// ...
const historyData = await ext.storage.local.get("usageHistory");
```
Dos `await` seqüencials quan es podrien combinar en un sol `get(["stats", "usageHistory"])`.

**Solució:** Combinar en una sola crida. Estalvia 1 round-trip a storage per cada resum generat.

---

## Q4 — Baixa urgència / Difícil

### D1 — `summary.js` massa gran (356 línies, massa responsabilitats)

`startSummary` gestiona: càrrega de config, comprovació de caché, extracció de contingut, crida API, streaming, guardat d'stats i DOM. Candidat a ser dividit en una pipeline: `loadConfig → checkCache → fetchContent → callApi → saveResults`.

---

### D2 — `ui.js` barreja 4 responsabilitats (550 línies)

Gestió d'estat dels botons, parser Markdown, lectura biònica, timers i indicadors de quota. Candidat a: `ui-buttons.js`, `ui-format.js`, `ui-status.js`.

---

### D3 — Tests per a `content.js`

`getPageContent` i `executeScriptSafe` requereixen mockejar `chrome.scripting.executeScript` i el DOM de la pàgina. Possible però laboriós (es necessita `jsdom` + mock complet de l'API de scripting).

---

### D4 — Historial navegable des de la sidebar

Funcionalitat proposada al ROADMAP (punt 11). Requereix component UI nou, gestió d'estat de navegació i potencialment redisseny de la toolbar.

---

### D5 — Publicació a Chrome Web Store

Crear compte CWS, preparar captures, descripció i política de privadesa adaptada per a Chromium. Pendent des de la Fase F del milestone 2.0.0.

---

## Resum executiu

| ID  | Descripció                                | Urgència | Dificultat |
|-----|-------------------------------------------|----------|------------|
| B1  | Model per defecte inconsistent            | Alta     | Trivial    |
| B2  | Codi duplicat reload API key              | Alta     | Trivial    |
| B3  | Token limit 8000 massa conservador        | Alta     | Fàcil      |
| B4  | background.bundle.js al repo              | Alta     | Trivial    |
| B5  | EUR_RATE hardcoded                        | Alta     | Fàcil      |
| A1  | Fallback quota usa models cars            | Alta     | Mitjana    |
| A2  | Caché sense expiració                     | Alta     | Mitjana    |
| A3  | Re-parse DOM complet per chunk streaming  | Alta     | Mitjana-alta |
| C1  | Migració ordre hardcoded                  | Baixa    | Fàcil      |
| C2  | Tests per formatTextToFragment/Bionic     | Baixa    | Fàcil      |
| C3  | Readability.js venedor manual             | Baixa    | Fàcil      |
| C4  | Dos reads seqüencials saveUsageStats      | Baixa    | Trivial    |
| D1  | summary.js refactor (massa gran)          | Baixa    | Alta       |
| D2  | ui.js refactor (massa gran)               | Baixa    | Alta       |
| D3  | Tests content.js                          | Baixa    | Alta       |
| D4  | Historial navegable sidebar               | Baixa    | Alta       |
| D5  | Publicació Chrome Web Store               | Baixa    | Alta       |
