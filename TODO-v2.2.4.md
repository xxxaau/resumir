# TODO — v2.2.4

Punts derivats de les 3 auditories (correctness, security, test coverage) realitzades
abans de la release v2.2.3. Auditories executades el 2026-04-23 amb els agents
`code-reviewer`, `security-auditor`, `test-engineer` sobre el commit `b10ea23`.

Actualitzat 2026-04-24 amb estat d'implementació per ítem.

---

## ✅ Seguretat — Alta prioritat (IMPLEMENTADA)

### ✅ SSRF a HackerNews
- **Fitxer:** `sidebar/content.js:68-84`
- **Implementat 2026-04-24:** ara valida `protocol === "https:"`, bloqueja hosts
  privats/loopback (`localhost`, `127.*`, `10.*`, `192.168.*`, `169.254.*`,
  `172.16-31.*`, `::1`, `metadata.*`), `credentials: "omit"`, cap a 2 MB.

### ✅ Prompt injection des de contingut de la pàgina
- **Fitxers:** `sidebar/summary.js:209`, `shared/defaults.js`
- **Implementat 2026-04-24:** el text extret es passa embolicat en
  `<UNTRUSTED_CONTENT>...</UNTRUSTED_CONTENT>` al cos enviat a Gemini. System prompt
  actualitzat amb instrucció de seguretat que tracta el contingut dins de les
  etiquetes com a dades, mai com a instruccions.

### ✅ API key a `storage.sync`
- **Fitxers:** `sidebar/sidebar.js`, `sidebar/summary.js`, `options/settings-options.js`
- **Implementat 2026-04-24:** migració invertida — la clau es mou de `storage.sync` →
  `storage.local` al primer load. Totes les lectures i escriptures migrades a
  `storage.local`. Listener `onChanged` adaptat per observar `area === 'local'`.

### ⏸️ `<all_urls>` com a permís requerit — REVERTIT
- **Fitxer:** `manifest.base.json`
- **Intent 2026-04-24:** mogut de `host_permissions` a `optional_host_permissions`.
- **Regressió detectada 2026-04-24:** el pre-flight de permisos a `sidebar/summary.js`
  va funcionar en tests unitaris però va trencar l'extracció real a YouTube perquè a
  Chrome els `await` intermedis fan perdre el "user gesture token" necessari per a
  `permissions.request()`. L'usuari clicava Summarize i el diàleg no apareixia.
- **Decisió:** revertir el canvi. Tornar a `host_permissions` (required). El
  pre-flight del summary.js també s'ha eliminat. Aquesta millora de seguretat queda
  diferida fins que es pugui dissenyar un flux UI dedicat (p.ex. demanar el permís
  global quan l'usuari acaba d'introduir la API key, o a un onboarding inicial).

---

## ✅ Correctness — Mitjana prioritat (IMPLEMENTADA)

### ✅ URL scheme validation
- **Fitxers:** `sidebar/sidebar.js:28`, `sidebar/history.js:94`, `sidebar/sidebar.js:146-152`
- **Implementat 2026-04-24:** validació `new URL(...).protocol in {http:, https:}`
  abans d'assignar `link.href` i abans de `ext.tabs.create`. Els esquemes desconeguts
  o URLs invàlides no obren cap pestanya i el href cau a `#`.

### ✅ Match de selector de YouTube — exact match first
- **Fitxer:** `sidebar/content.js:202-214`
- **Implementat 2026-04-24:** ordre de resolució ara és `===` estricte primer,
  substring com a fallback (amb filtre de nom buit i ordenació per longitud desc).
- **Continuació:** aquest mateix fitxer té un pla molt més ampli a
  **`TODO-youtube-multilang.md`** — l'`activeName` del panell modern sempre ve buit
  perquè YouTube ja no l'exposa al DOM. Cal migrar a Player API.

### ✅ `isRetryable` regex massa permissiu
- **Fitxer:** `sidebar/summary.js:286-299`
- **Implementat 2026-04-24:** eliminat `msg.includes("model")` genèric. Substituït per
  frases específiques: `"model not found"`, `"model unavailable"`,
  `"model is not available"`.

---

## ✅ Test coverage — Baixa-mitjana prioritat (PARCIALMENT IMPLEMENTADA)

### ✅ `tests/sidebar-title-strip.test.mjs` prova el mock, no el codi real
- **Implementat 2026-04-24:** fitxer eliminat. Les funcions `showPageTitleStrip` i
  `hidePageTitleStrip` no estan exportades; es cobreixen via e2e.

### ✅ Snapshot brittle a `tests/api.test.mjs`
- **Fitxer:** `tests/api.test.mjs:56`
- **Implementat 2026-04-24:** `CURATED_MODELS.length === 6` → asserts sobre presència
  de `gemini-2.5-flash` i `gemini-2.5-pro`, més check que hi hagi almenys un model.

### ✅ `callGeminiStream` SSE parser sense tests
- **Fitxer:** `sidebar/api.js:32-137`
- **Implementat 2026-04-24:** 10 tests a `tests/api-stream.test.mjs`:
  - Línia `data:` dividida entre 2 chunks (buffer del parser).
  - Sentinel `[DONE]` final s'ignora sense excepció.
  - `part.thought: true` s'ignora (thinking models).
  - `usageMetadata` crida `onUsage` amb valors correctes; sense metadata → zeros.
  - Errors HTTP (401, 429, 500) llancen missatge amb codi `[007]`.
  - Múltiples parts en un sol chunk → onChunk per cadascuna.

### ✅ Cobertura zero a `background.js` i `ext.js`
- **Fitxers:** `background.js`, `ext.js`
- **Implementat 2026-04-24:** 6 tests a `tests/ext.test.mjs`:
  - `ext.sidebar.open` Chromium: getCurrent èxit → sidePanel.open rep windowId.
  - `ext.sidebar.open` Chromium: getCurrent rebutja → sidePanel.open amb `{}`.
  - `ext.sidebar.open` Chromium: windowId explícit → no crida getCurrent.
  - `ext.sidebar.open` Firefox: delega a sidebarAction.open.
  - `ext.menus` Chromium apunta a chrome.contextMenus.
  - `ext.menus` Firefox apunta a browser.menus.

---

## ✅ Neteja — Baixa prioritat (IMPLEMENTADA)

### ✅ `console.log` restants i catches silenciosos
- **Fitxer:** `sidebar/content.js:389`
- **Implementat 2026-04-24:** `catch (e) {}` → `console.debug` amb context
  ("Readability.js inject failed (CSP or permission)"). LinkedIn console.warn/log
  diagnòstics eliminats a v2.2.3.

### ✅ Magic numbers a l'extracció de YouTube
- **Fitxer:** `sidebar/content.js:179, 188`
- **Implementat 2026-04-24:** comentaris afegits explicant `sleep(600)` (empíricament
  suficient per a dispositius lents) i el bucle `40 × 250ms = 10 s màxim`.

### ✅ Bug de `set_dev_mode.ps1`: write-before-merge
- **Fitxer:** `set_dev_mode.ps1`
- **Implementat 2026-04-24:** `Write-JsonFile $basePath $base` ara s'executa ABANS del
  `merge-manifest.mjs`. Abans quedava al final i el merge llegia una base obsoleta.

---

## 🎬 Treball de continuació

### 🎬 YouTube transcripció multi-idioma — pla complet
- **Fitxer:** [`TODO-youtube-multilang.md`](./TODO-youtube-multilang.md)
- **Estat:** Pla detallat amb auditoria viva (Playwright 2026-04-23). Inclou:
  - Fase 5: Pre-flight de permisos (resol la regressió del canvi a `optional_host_permissions`).
  - Fase 1+2+3: Migració a Player API (`#movie_player.getOption('captions', ...)`).
  - Fase 4: Detecció del botó "Mostra la transcripció" multi-idioma (no depèn de regex fràgil).
  - Fase 6: Setting UI "Idiomes preferits per a YouTube".
  - Fase 7: 7 tests nous a `tests/youtube-track-select.test.mjs`.
- **Prioritat suggerida:** implementar **Fase 5 primer** (regressió crítica) abans
  d'alliberar v2.2.4. La resta pot anar a v2.2.5.

---

## Resum de l'estat

| Categoria | Implementat | Pendent |
|-----------|------------|---------|
| Seguretat | 4 / 4 | 0 |
| Correctness | 3 / 3 | 0 |
| Test coverage | 4 / 4 | 0 |
| Neteja | 3 / 3 | 0 |
| **Total v2.2.4** | **14 / 14** | **0** |
| YouTube multi-idioma (continuació) | 0 / 6 fases | 6 |

## Font

- Auditories inicials 2026-04-23 (commit `b10ea23`).
- Implementació 2026-04-24 (WIP, no commitejat).
- Auditoria viva YouTube 2026-04-23 amb Playwright.
