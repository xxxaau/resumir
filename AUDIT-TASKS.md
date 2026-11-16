# AUDIT-TASKS — informe d'auditoria i pla d'implementació

> **Fitxer de treball temporal.** No és documentació de producte: esborra'l quan
> totes les tasques estiguin tancades (o, si es vol conservar, mou-lo a `docs/`
> i afegeix-lo a `docs/DOCS-INDEX.md` en el mateix commit).

- **Data:** 2026-11-10
- **Commit base:** `33ee20c` (v2.7.2)
- **Entorn verificat:** Windows 11, PowerShell 5.1, Node v26.13.0, npm 11.20.0
- **Abast:** extensió Resumir (Firefox + Chromium), sidebar, options, scripts i tests.
- **Revisió 2026-11-16:** segona passada (agent Fable) que valida T01–T14 contra
  el codi i hi afegeix N01–N15 (§8). Correccions incorporades a T01, T04, T06,
  T07, T08, T09, T12 i T13 (marcades amb «**Revisió:**»). Ordre d'execució
  actualitzat a §8.3.
- **Fitxers modificats en fer l'auditoria:** cap fitxer font. `npm install` va
  tocar `package-lock.json` (no forma part de cap tasca; no el commitis si no
  és intencionat).

---

## ESTAT DE PROGRÉS (actualitzat 2026-11-16, final de sessió)

**Línia base actual:** `npm test` → 861 OK, `npm run lint` → 0 avisos. Tot a `main`, un commit
per tasca, amb test de regressió (verificat que falla sense el fix). Cap versió ni tag tocats;
la release **no** està preparada.

### Fet (ordre d'execució de §8.3, passos 1–5)

| Tasca | Commit | Nota |
|-------|--------|------|
| N03 | `ea4d2ad` | Connectors per hostname (helper `urlIsOnSite`) |
| T02 | `63c22c5` | Anki desat: `canGenerateMore:false` |
| N02 | `f562206` | Resposta sense text → error `[012]` |
| N01 (cas C) | `a720aec` | Pestanyes de tipus ignorades mentre es genera |
| N01 (cas A) | `acec5de` | Guarda de «generació substituïda» a `startSummary` (no s'ha fet la refactorització a variable local que proposava el pla) |
| T01 (simple) | `6ec6949` | `isBlockedArticleHost`: rebutja IP literals, hosts sense punt i sufixos locals. **No** hi ha parser IPv6 |
| N15 | `c008eb9` | `docs/SECURITY.md` corregit |
| T03 | `5c6ce4e` | `exitCodeFor` + `process.execPath` |
| T05 | `18465d0` | Desfer restaura `style` i `stats` |
| T08 | `82bf0e2` | Tema per defecte |
| N09 | `54f4486` | `null` sense `usageMetadata` + estimació entera (substitueix T12.1) |
| N14 | `97aea11` | Plantilles d'exportació en una sola passada (`fillTemplate`) |
| N10 | `b35df44` | PDF local >7 MB: sense visor, base64 per blocs |
| N13 | `4db1727` | Un 429 accepta la clau. Els 5xx/xarxa **no** (decisió pendent d'UX: «Desar igualment») |
| T06 | `f8f2e8b` | Models: clau normalitzada, paginació, no esborra favorits si la llista és parcial |
| CHANGELOG | `2c0c339` | Secció `## [Pendent de publicar]` amb totes les entrades fins aquí |

### Pendent (en aquest ordre; vegeu §8.3)

6. **N07 + T09** — esborrar el codi mort d'estadístiques (`getDailyStats`, `dailyStats`) i
   actualitzar `DEV-CONTEXT.md:62` i `ARCHITECTURE.md:76`; aplicar el **dia local** a
   `computeUsageSummary` / `options/settings-stats.js:21-22` (el «Avui» real) i la **setmana ISO
   local** a `formatObsidianPath` (`isoWeekFromYMD`, sense canviar `getISOWeekDate`).
7. **N08** — deixar de desar `title`/`url` a `usageHistory` (`cache.js:287-297`). **Pregunteu
   primer a l'usuari:** toca privadesa → revisar `docs/PRIVACY_POLICY.md`.
8. **N04** (triggers a totes les finestres + `pendingSummary` sense caducitat) i **T04** amb
   `navigator.locks` (la cua per context no resol la cursa real, entre finestres).
9. **T07 + N11** (destruir `loadingTask` en timeout, timeout del bucle de pàgines, codi d'error
   NOU per mida — `TOO_LARGE` ja vol dir «500 pàgines»), **N05** (decisió d'UX sobre el preload),
   **N06** (Anki «Generar més»: truncament, fallback, stats, persistència).
10. Eines: **T10, T11, N12, T13**.
11. Opcionals: **T14** (opció B recomanada, demaneu confirmació), **T12.2/T12.3**.

### Regles de procés confirmades en aquesta sessió

- **CHANGELOG a mesura que es treballa:** cada canvi visible s'anota a `## [Pendent de
  publicar]` (`docs/CHANGELOG.md`) al mateix lliurament. En preparar la release, renomenar la
  capçalera a `## [X.Y.Z] - AAAA-MM-DD` i córrer `node scripts/update-changelog-html.mjs`.
- Abans de la release, revisar les **quatre superfícies públiques** (README, «Sobre l'extensió»,
  CHANGELOG, web + `MARKETS-COPY.md`); avui només s'ha tocat el CHANGELOG i `SECURITY.md`.
- `git push` d'aquests commits autoritzat per l'usuari el 2026-11-16. **Mai** push de tag,
  AMO ni GitHub Release sense confirmació explícita.
- `package-lock.json` apareix modificat (15 línies esborrades per un `npm install` previ):
  **no és intencionat, no el commitegeu**.

### Trampes trobades (estalvien temps)

- Els tests de `startSummary` necessiten `global.DEFAULT_ANKI_*` per al camí Anki.
- Als tests d'integració de la sidebar, `h.calls.fetches` inclou també fetches no relacionats
  (p. ex. la pestanya activa): filtreu per `generativelanguage`.
- Escriure strings amb `
` des d'un script Python via heredoc els converteix en salts reals:
  verifiqueu amb `node --test` abans de commitejar.
- Els fitxers del repo tenen finals de línia CRLF; manteniu-los (`newline=''` en Python).

---

## 0. Context, comandes i regles

### 0.1 Comandes de referència

```powershell
npm install
npm run check            # lint (0 warnings) + tots els tests
npm test                 # node scripts/run-tests.mjs
npm run lint             # eslint, --max-warnings 0
node --test tests\<fitxer>.test.mjs   # un sol fitxer
npm run build            # genera build\*.zip (gitignored)
npm run prerelease       # 19 checks; requereix build previ
npm run vendor:verify
```

Línia base en començar (ha de continuar verda):

- `npm run lint` → 0 avisos.
- `npm test` → 835 tests OK.
- `npm run build` → 2 ZIP (<4 MB).
- `npm run prerelease` → 19/19 OK.
- `npm run vendor:verify` → 3 hashes OK.

### 0.2 Regles obligatòries del repo (`CLAUDE.md`)

1. **Cada bugfix porta el seu test de regressió** i s'ha de comprovar que
   **falla sense el fix i passa amb el fix**. Procediment:
   ```powershell
   # 1) escriu el test amb el codi actual (ha de fallar)
   node --test tests\<fitxer>.test.mjs
   # 2) aplica el fix
   node --test tests\<fitxer>.test.mjs   # ha de passar
   ```
   Si el test nou depèn d'una funció encara no exportada, val que falli per
   `ERR_MODULE_NOT_FOUND`/`undefined is not a function`: demostra que el
   comportament no existia.
2. `npm test` i `npm run lint` han de passar (0 warnings) abans de donar res per fet.
3. **Commits atòmics**: una tasca = un commit. No barregis tasques.
4. **No editar mai** `manifest.json` ni `manifest.chromium.json` a mà (es generen).
   No pujar versió ni crear tags (això és exclusiu de `npm version X.Y.Z`).
5. No afegir dependències noves.
6. Mantenir el codi **CSP-safe**: res d'`innerHTML`, `eval`, `new Function`,
   `onclick` inline. Construir DOM amb nodes.
7. Respectar l'estil local: comentaris en català, només quan expliquen una
   decisió no òbvia. Missatges d'UI en català.
8. Si un canvi és visible per a l'usuari, s'ha d'anotar a `docs/CHANGELOG.md`
   **quan es prepari la release** (no inventis una versió nova ara). Després:
   `node scripts/update-changelog-html.mjs`. Les 4 superfícies públiques
   (README, «Sobre l'extensió», CHANGELOG, web) només cal tocar-les si el canvi
   és funcionalment rellevant per a l'usuari final.
9. No tocar codi no relacionat amb la tasca. Si detectes un problema nou,
   afegeix-lo al final d'aquest fitxer en lloc d'arreglar-lo de passada.

### 0.3 Nota sobre números de línia

Els `fitxer:línia` corresponen al commit `33ee20c`. Si deriven, localitza amb
`rg` pel símbol indicat; el símbol és la font de veritat, no el número.

### 0.4 Ordre recomanat

`T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T11 → opcionals`.
Les tres primeres són les que més valor aporten. T12–T14 són opcionals i no
bloquegen res.

> **Revisió 2026-11-16:** aquest ordre queda **substituït per §8.3**, que
> integra les tasques noves N01–N15 i reordena per valor/esforç.

---

## 1. Resum executiu

| ID  | Severitat | Títol                                                        | Fitxers principals |
|-----|-----------|--------------------------------------------------------------|--------------------|
| T01 | ~~Alt~~ Mig-baix | El guard SSRF IPv6 no bloqueja mai res (GET cec; vegeu revisió) | `sidebar/content.js` |
| T02 | Mig-alt   | «Generar més»/«Afinar» a l'Anki desat: mort o amb text d'una altra pàgina | `sidebar/summary.js`, `sidebar/anki.js` |
| T03 | Mig-baix  | El runner de tests pot sortir amb èxit sense executar res     | `scripts/run-tests.mjs` |
| T04 | Baix (abast reduït) | Pèrdua d'actualitzacions a `saveUsageStats` (només entre finestres) | `sidebar/cache.js` |
| T05 | Baix      | «Desfer» de l'Historial perd `style` i `stats`                | `sidebar/cache.js` |
| T06 | Mig-baix  | Actualitzar models: clau crua, sense paginació i **esborra favorits vàlids** | `options/settings-models.js` |
| T07 | Baix      | Fuita de worker de pdf.js en timeout + PDF sense límit de mida | `sidebar/pdf-extract.js`, `sidebar/content.js` |
| T08 | Molt baix | `data-theme="undefined"` si s'esborra la clau del tema (només via DevTools) | `theme.js` |
| T09 | Baix      | Rutes Obsidian: dia local vs setmana UTC (i dia de stats UTC) | `sidebar/utils.js`, `sidebar/cache.js`, `sidebar/stats.js` |
| T10 | Baix      | El check de `?key=` no veu `fetch()` multilínia               | `scripts/pre-release-check.mjs` |
| T11 | Chore     | Soroll de build i paràmetre mort                              | `scripts/build.mjs` |
| T12 | Opcional  | Robustesa i poliment (tokens, aturada, parsing Anki)          | `sidebar/summary.js`, `sidebar/anki.js` |
| T13 | Opcional  | `system_instruction.parts` com a array                        | `sidebar/api.js` |
| T14 | Decisió   | Claus òrfenes de mapa conceptual                              | `sidebar/summary.js`, `options/*` |
| N01–N15 | Vari  | Punts nous de la revisió del 2026-11-16 (vegeu §8)            | Vari |

---

## 2. Tasques

### T01 — El guard SSRF IPv6 no bloqueja mai res

> **Revisió 2026-11-16 — severitat rebaixada a mig-baix i fix a repensar.**
> - **Impacte sobreestimat:** el fetch exigeix `https:`, port 443 i certificat
>   vàlid per al host, va sense credencials, i la resposta no torna a l'atacant
>   sinó al Gemini de l'usuari. És un GET cec, no una exfiltració.
> - **El parser de l'esbós té 3 forats** (provats): `[::7f00:1]` (forma de
>   `[::127.0.0.1]`), `[64:ff9b:1::a9fe:a9fe]` (NAT64 local, RFC 8215) i
>   `[::ffff:0:7f00:1]` passen com a públics.
> - **Fora de l'abast del guard, abans i després del fix:** `localhost.`,
>   `foo.localhost`, `*.nip.io`, `metadata.google.internal`, hosts sense punt,
>   `.local`, `.lan` (noms DNS que resolen a IP privades).
> - **Recomanació (versió simple, Fàcil):** a un enllaç d'article de HN,
>   rebutjar **qualsevol IP literal** (v4 i v6) i els sufixos `.localhost`,
>   `.local`, `.internal`, `.lan`, més els hosts sense punt. 3–5 línies, sense
>   parser i sense superfície de bypass. El parser complet de sota només si es
>   vol permetre algun literal; en aquest cas corregeix els 3 forats.
> - Després del fix, corregeix l'afirmació de `docs/SECURITY.md` sobre la
>   denylist SSRF (vegeu N15).

**Severitat:** ~~alt~~ mig-baix (seguretat)
**Fitxers:** `sidebar/content.js:68-93` (`isPrivateOrReservedIP`),
`sidebar/content.js:105-143` (`fetchLinkedArticleText`),
`sidebar/content.js:873-876` (exports).

**Símptoma / evidència.**
`fetchLinkedArticleText` només permet `https:`, sense port explícit, i rebutja
hosts privats/reservats. Per a IPv6, el guard no s'activa mai perquè
`new URL(...).hostname` retorna el literal **amb claudàtors**. Reproducció
(Node 26):

```
http://[::1]/                 hostname="[::1]"                blocked=false
http://[fe80::1]/             hostname="[fe80::1]"            blocked=false
http://[fc00::1]/             hostname="[fc00::1]"            blocked=false
http://[fd12::1]/             hostname="[fd12::1]"            blocked=false
http://[::ffff:127.0.0.1]/    hostname="[::ffff:7f00:1]"     blocked=false
http://127.0.0.1/             hostname="127.0.0.1"           blocked=true
```

`http://2130706433/`, `http://127.1/`, `http://0x7f.0.0.1/` i
`http://0177.0.0.1/` sí que es normalitzen a `127.0.0.1` i es bloquegen: el forat
és només IPv6.

**Impacte.** Una tramesa a Hacker News amb l'enllaç de l'article apuntant a
`https://[::1]/...` (o ULA/link-local) fa que el sidebar faci un GET a un servei
intern i n'enviï el text a Gemini (el retorn només s'usa si és HTML i >200
caràcters). Cal acció de l'usuari (obrir el fil i prémer Resumir), però és un
primitiu real d'SSRF + exfiltració.

**Fix proposat.**

1. Normalitza el host: treu `[` i `]` inicials/finals.
2. Extreu la lògica IPv4 actual a un helper `_ipv4IsPrivate(octets)` per
   reutilitzar-la.
3. Afegeix `_parseIPv6(h)` → array de 8 enters de 16 bits, o `null` si és invàlid.
   Ha de suportar compressió `::`, majúscules i cua amb punts (`::ffff:127.0.0.1`),
   tot i que `URL` normalment ja la converteix a hex.
4. Classifica:
   - `::` (no especificat) → bloqueja.
   - `::1` (loopback) → bloqueja.
   - `::ffff:0:0/96` (IPv4-mapped) → decodifica els 32 bits finals i aplica
     `_ipv4IsPrivate`.
   - `64:ff9b::/96` (NAT64) → decodifica els 32 bits finals i aplica
     `_ipv4IsPrivate` (si falla, bloqueja).
   - `2002::/16` (6to4) → decodifica l'IPv4 incrustada i aplica `_ipv4IsPrivate`.
   - `fe80::/10` (link-local) → bloqueja.
   - `fec0::/10` (site-local, obsolet) → bloqueja.
   - `fc00::/7` (ULA) → bloqueja.
   - `ff00::/8` (multicast) → bloqueja.
   - La resta → permet.
   - Si `_parseIPv6` retorna `null`, bloqueja (conservador).

Esbós:

```js
function _ipv4IsPrivate(octets) {
    if (octets.length !== 4 || octets.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
    const [a, b] = octets;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 192 && b === 0 && octets[2] === 0) return true;       // 192.0.0.0/24
    if (a === 192 && b === 0 && octets[2] === 2) return true;       // 192.0.2.0/24
    if (a === 198 && (b === 18 || b === 19)) return true;           // 198.18.0.0/15
    if (a === 198 && b === 51 && octets[2] === 100) return true;    // 198.51.100.0/24
    if (a === 203 && b === 0 && octets[2] === 113) return true;     // 203.0.113.0/24
    if (a >= 224) return true;                                      // multicast+reservat
    return false;
}

// Retorna [g0..g7] o null.
function _parseIPv6(h) {
    if (h.includes(".")) {
        const i = h.lastIndexOf(":");
        const v4 = h.slice(i + 1).split(".").map(Number);
        if (v4.length !== 4 || v4.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return null;
        h = h.slice(0, i + 1) + ((v4[0] << 8) | v4[1]).toString(16) + ":" + ((v4[2] << 8) | v4[3]).toString(16);
    }
    const halves = h.split("::");
    if (halves.length > 2) return null;
    const parse = s => s === "" ? [] : s.split(":").map(x => /^[0-9a-f]{1,4}$/.test(x) ? parseInt(x, 16) : NaN);
    const a = parse(halves[0]);
    const b = halves.length === 2 ? parse(halves[1]) : [];
    if ([...a, ...b].some(n => Number.isNaN(n))) return null;
    if (halves.length === 1) return a.length === 8 ? a : null;
    if (a.length + b.length >= 8) return null;
    return [...a, ...Array(8 - a.length - b.length).fill(0), ...b];
}

function isPrivateOrReservedIP(hostname) {
    let h = String(hostname || "").toLowerCase();
    if (h.startsWith("[") && h.endsWith("]")) h = h.slice(1, -1);
    const m = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (m) return _ipv4IsPrivate(m.slice(1).map(Number));
    if (h.includes(":")) {
        const g = _parseIPv6(h);
        if (!g) return true;
        const v4FromTail = () => [g[6] >> 8, g[6] & 0xff, g[7] >> 8, g[7] & 0xff];
        if (g.every(x => x === 0)) return true;                       // ::
        if (g.slice(0, 7).every(x => x === 0) && g[7] === 1) return true; // ::1
        if (g[0] === 0 && g[1] === 0 && g[2] === 0 && g[3] === 0 &&
            g[4] === 0 && g[5] === 0xffff) return _ipv4IsPrivate(v4FromTail()); // ::ffff:0:0/96
        if (g[0] === 0x64 && g[1] === 0xff9b && g[2] === 0 && g[3] === 0 &&
            g[4] === 0 && g[5] === 0) return _ipv4IsPrivate(v4FromTail());     // 64:ff9b::/96
        if (g[0] === 0x2002) return _ipv4IsPrivate([g[1] >> 8, g[1] & 0xff, g[2] >> 8, g[2] & 0xff]);
        if ((g[0] & 0xffc0) === 0xfe80) return true; // fe80::/10
        if ((g[0] & 0xffc0) === 0xfec0) return true; // fec0::/10
        if ((g[0] & 0xfe00) === 0xfc00) return true; // fc00::/7
        if ((g[0] & 0xff00) === 0xff00) return true; // ff00::/8
        return false;
    }
    return /^(localhost|metadata|internal)$/i.test(h);
}
```

Exporta `isPrivateOrReservedIP` a `module.exports` (`content.js:873-876`) per
poder-lo testar. La funció assumeix un host **ja normalitzat per `URL`** (com
avui): les formes abreujades d'IPv4 (`2130706433`, `127.1`, `0x7f...`) les
normalitza el navegador abans de cridar-la. No hi afegeixis normalització
d'IPv4 a mà; només treu els claudàtors d'IPv6.

**Tests a afegir** — `tests/content.test.mjs` (ja carrega `content.js` amb
globals i exporta funcions):

- `isPrivateOrReservedIP - IPv6: bloqueja loopback, link-local, ULA, multicast i mapped`
  - `[::1]`, `[0:0:0:0:0:0:0:1]`, `[::]` → `true`
  - `[fe80::1]`, `[fc00::1]`, `[fd12::1]`, `[ff02::1]`, `[fec0::1]` → `true`
  - `[::ffff:127.0.0.1]` i `[::ffff:7f00:1]` → `true`
  - `[::ffff:169.254.169.254]` → `true`
  - `[64:ff9b::a9fe:a9fe]` (NAT64 de 169.254.169.254) → `true`
- `isPrivateOrReservedIP - IPv6 pública es permet`
  - `[2606:4700:4700::1111]`, `[2001:db8::1]` (documentació, no privada) → `false`
- `isPrivateOrReservedIP - IPv4 es manté igual`
  - `10.0.0.1`, `127.0.0.1`, `169.254.169.254`, `172.16.0.1`,
    `192.168.1.1`, `100.64.0.1`, `224.0.0.1` → `true`
  - `8.8.8.8`, `1.1.1.1` → `false`
  - Formes abreujades: **prova-les com al codi real**, passant per
    `new URL(...).hostname` (la funció rep el host ja normalitzat):
    `new URL("http://2130706433/").hostname`,
    `new URL("http://127.1/").hostname`,
    `new URL("http://0x7f.0.0.1/").hostname`,
    `new URL("http://0177.0.0.1/").hostname` → `"127.0.0.1"` → `true`
  - `localhost`, `metadata`, `internal`, `METADATA` → `true`

**Per què falla abans:** els literals IPv6 amb claudàtors no coincideixen amb
cap branca (`lower === "::1"` etc.) i retornen `false`. Abans del fix també cal
exportar la funció; si no, el test falla per `undefined`.

**Verificació:** `node --test tests/content.test.mjs` i `npm run check`.

**Fora d'abast:** el fetch de PDFs (`content.js:216+`) no passa per aquest guard
perquè la URL ve de la pestanya que l'usuari ha obert; no és SSRF induïda per
contingut. Els salts de redirecció es re-validien *després* de la resposta
(`content.js:133-143`): el GET intermedi a un host intern ja s'ha fet, però no
se'n llegeix el cos. Documenta-ho com a risc residual acceptat; no canviïs a
`redirect: "manual"` (els redirects creuats opacs trencarien el flux).

---

### T02 — «Generar més»/«Afinar» a l'Anki desat: mort o amb text d'una altra pàgina

**Severitat:** mig-alt (funcional)
**Fitxers:** `sidebar/summary.js:298-301` (branca Anki de memòria cau),
`sidebar/summary.js:784-791` (`buildAnkiCtx`), `sidebar/summary.js:391`
(`window.__ankiPageText`), `sidebar/anki.js:242-243`, `:304`, `:426`.

**Símptoma.** En reobrir un resum Anki desat (memòria cau), el panell mostra els
botons «Generar més» i «Afinar», però el clic no genera res o, pitjor, usa
`window.__ankiPageText` d'una altra pàgina (contaminació creuada).

**Causa arrel.** `buildAnkiCtx(ctx)` no propaga `canGenerateMore`, així que
`renderAnkiPanel` fa `const canGenerateMore = ctx.canGenerateMore !== false`
(`anki.js:242`) i els botons apareixen. Però el text original de la pàgina
només s'assigna al camí en viu (`summary.js:391`); la memòria cau no el guarda.
`sidebar/history.js:114` ja ho resol amb `canGenerateMore: false` i té test a
`tests/history-panel.test.mjs:364`.

**Fix proposat.** A `summary.js:298-301`, passa explícitament `false`:

```js
} else if (isCachedAnki) {
    // Restaura l'estat Anki des de caché. Sense el text original de la pàgina
    // (no es persisteix), regenerar amb contingut equivocat seria pitjor que no
    // oferir-ho: amaguem els controls, com fa l'Historial (history.js:114).
    setAnkiCards(parseAnkiCards(displayText));
    renderAnkiPanel({ ...buildAnkiCtx(ctx), canGenerateMore: false });
}
```

No cal tocar el camí en viu (`summary.js:596-597`), que sí que té
`window.__ankiPageText`.

> **Revisió 2026-11-16:** fix confirmat. El «test germà en viu» necessita
> `global.window = {}`; sense això `summary.js:391` no assigna
> `__ankiPageText`. Reforç barat opcional: desar `{url, text}` i comparar l'URL
> a `generateMoreAnkiCards` per evitar la contaminació creuada en origen.

**Test a afegir** — `tests/start-summary.test.mjs` (ja té harness i un test de
memòria cau a prop de la línia 211). Nou test:

- Nom: `startSummary - Anki des de memòria cau: renderAnkiPanel amb canGenerateMore:false`
- Setup:
  - `setupGlobals({ getSummaryCache: async () => ({ title: "T", url: "https://example.com", type: "anki", summary: "<!--anki-->\n[{\"q\":\"pregunta\",\"a\":\"resposta\"}]", timestamp: new Date().toISOString() }) })`
  - `global.parseAnkiCards = () => [{ q: "pregunta", a: "resposta" }]`
  - `global.setAnkiCards = () => {}`
  - `let captured = null; global.renderAnkiPanel = (c) => { captured = c; };`
- Crida:
  `await startSummary(makeCtx(), null, false, false, true, false, false, true)`
  (últim `true` = `isAnki`).
- Assercions: `assert.equal(captured.canGenerateMore, false)` i
  `assert.equal(typeof captured.onGenerateMore, "function")` (o almenys que es
  crida).
- Addicional (per no trencar el camí en viu): un test germà que, amb
  `getSummaryCache: async () => null` i `callGeminiStream` retornant JSON Anki,
  comprovi que `captured.canGenerateMore` **no** és `false` i que
  `window.__ankiPageText` s'ha assignat.

**Per què falla abans:** `captured.canGenerateMore` és `undefined` (el panell
l'interpreta com a `true`), així que `=== false` falla. El test germà en viu ja
passaria abans; serveix de guard perquè el fix no amagui els botons on sí que
tenen sentit.

**Verificació:** `node --test tests/start-summary.test.mjs` i `npm run check`.

**Nota de release:** és un canvi visible per a l'usuari; anota'l al
`docs/CHANGELOG.md` quan es prepari la propera versió (no incrementis la versió
aquí).

---

### T03 — El runner de tests pot sortir amb èxit sense executar res

> **Revisió 2026-11-16:** fix correcte. Afegeix-hi `process.execPath` en lloc
> de `'node'` a `spawnSync`. Ja és a `docs/BACKLOG.md` («Petits»): treu-lo
> d'allà en tancar-lo. `eslint.config.mjs` ignora `scripts/**`, així que el
> mòdul nou no es linta.

**Severitat:** mig-baix (integritat de la CI/eines)
**Fitxer:** `scripts/run-tests.mjs:36-41`

**Símptoma.** `process.exit(result.status || 0)`. Si `spawnSync` falla
(`result.status === null`: `node` no trobat, ENOENT, procés mort per senyal),
surt amb **codi 0**. Un CI o un agent poden reportar «verd» sense haver corregut
cap test.

**Fix proposat.**

1. Crea `scripts/run-tests-exit.mjs`:

```js
/**
 * Codi de sortida de spawnSync per a `node --test`.
 * Mai tracta un error de spawn o un signal com a èxit.
 */
export function exitCodeFor(result) {
    if (!result || result.error || result.signal) return 1;
    return typeof result.status === "number" ? result.status : 1;
}
```

2. A `scripts/run-tests.mjs`:

```js
import { exitCodeFor } from "./run-tests-exit.mjs";
// ...
if (result.error) console.error(`❌ No s'ha pogut executar node: ${result.error.message}`);
if (result.signal) console.error(`❌ Els tests s'han interromput pel senyal ${result.signal}`);
process.exit(exitCodeFor(result));
```

Important: no usis `||` ni `??` amb el status; `0` és un èxit vàlid.
No canviïs `stdio: "inherit"` (les sortides dels tests s'han de veure).

**Test a afegir** — `tests/run-tests-exit.test.mjs`:

- `exitCodeFor({ status: 0 }) === 0`
- `exitCodeFor({ status: 2 }) === 2`
- `exitCodeFor({ status: null, error: new Error("ENOENT") }) === 1`
- `exitCodeFor({ status: null, signal: "SIGTERM" }) === 1`
- `exitCodeFor({ status: null }) === 1`
- `exitCodeFor(undefined) === 1`

**Per què falla abans:** el mòdul no existeix; el test falla a l'import. Després
del fix, tots dos mòduls passen i `npm test` segueix funcionant.

**Verificació:** `node --test tests/run-tests-exit.test.mjs`; després `npm test`
(ha de continuar corrent els 835+ tests) i `npm run lint`.

---

### T04 — Pèrdua d'actualitzacions a `saveUsageStats`

> **Revisió 2026-11-16 — abast reduït.** La lectura-modificació-escriptura és
> real, però l'escenari descrit (doble clic) no es pot produir: `doSummary`
> (`sidebar.js:133-137`) atura la generació en curs en lloc d'executar-ne dues,
> i `generateMoreAnkiCards` no escriu stats. L'única cursa real és **entre
> finestres**, que la cua proposada no cobreix. Alternativa recomanada:
> `navigator.locks.request("resumir-stats", …)`, que serialitza entre contextos
> del mateix origen, amb la cua de sota com a fallback per als tests (Node).
> Dificultat: Mitjà.

**Severitat:** ~~mig-baix~~ baix (dades)
**Fitxer:** `sidebar/cache.js:275-314`

**Símptoma.** `saveUsageStats` fa llegir-modificar-escriure de `stats`,
`usageHistory` i `dailyStats` sense cap serialització. Dues generacions
simultànies al mateix sidebar (p. ex. doble clic/dues pestanyes) llegeixen el
mateix estat i l'última escriptura trepitja l'altra: es perd un article, unes
tokens i una entrada de l'historial. L'índex de caché sí que té cua
(`withCacheIndexLock`, `cache.js:36-41`); les stats no.

**Fix proposat.** Serialitza el cos sencer amb una cua pròpia (no reutilitzis
`withCacheIndexLock` amb un altre nom si vols evitar acoblament; una cua
separada n'hi ha prou dins del mateix context JS):

```js
let _statsQueue = Promise.resolve();
function withStatsLock(task) {
    const run = _statsQueue.then(task, task);
    _statsQueue = run.catch(() => {});
    return run;
}

async function saveUsageStats(...) {
    return withStatsLock(async () => {
        // ... cos actual, sense canvis ...
    });
}
```

**Limitació coneguda (documenta-la al comentari):** la cua és per context JS.
Dues instàncies del sidebar en finestres diferents poden seguir competint; una
solució completa requeriria un únic escriptor (background) o un mutex a
`storage.session`. Fora d'abast.

**Test a afegir** — `tests/cache-concurrency.test.mjs` (ja té un mock de storage
asíncron amb `tick()` i `_dump()`):

- Importa també `saveUsageStats`.
- Test: `saveUsageStats - dos guardats simultanis no es trepitgen`
  - `inner._clear()`
  - `await Promise.all([saveUsageStats(10, 5, "summary", "m", 100, "A", "https://a.com"), saveUsageStats(20, 7, "deepdive", "m", 100, "B", "https://b.com")])`
  - `const dump = inner._dump()`
  - `assert.equal(dump.stats.articles, 2)`
  - `assert.equal(dump.stats.tokens, 42)` (10+5+20+7)
  - `assert.equal(dump.usageHistory.length, 2)`
  - `const day = new Date().toISOString().slice(0, 10); assert.equal(dump.dailyStats[day], 2)`
  - Si T09 canvia el càlcul del dia, adapta l'asserció a la clau local resultant.
- Per què falla abans: ambdues crides llegeixen `articles: 0`; el resultat final
  és `articles: 1`, `usageHistory.length: 1`, `dailyStats[day]: 1`.

**Verificació:** `node --test tests/cache-concurrency.test.mjs` i `npm run check`.

---

### T05 — «Desfer» de l'Historial perd `style` i `stats`

**Severitat:** baix (dades)
**Fitxers:** `sidebar/cache.js:167-197` (`listCachedSummaries`),
`sidebar/cache.js:251-273` (`restoreSummaryCacheEntries`),
`sidebar/history.js:365-398` (flux d'esborrar/desfer).

**Símptoma.** En esborrar una entrada de l'Historial i prémer «Desfer», la
còpia restaurada perd:
- `style` (format|llargada): un resum generat amb `bullets|long` es pot
  reutilitzar com si fos `default|medium` (`summary.js:273`).
- `stats` (tokens d'entrada/sortida): la línia de procedència i els comptes
  surten a 0.

**Fix proposat.**

1. `listCachedSummaries` ha de retornar també `style` i `stats`:
   ```js
   entries.push({
       url: value.url, title: value.title, model: value.model,
       timestamp: value.timestamp, summary: value.summary, type,
       style: value.style,
       stats: value.stats,
   });
   ```
2. `restoreSummaryCacheEntries` ha de conservar-los:
   ```js
   toSet[key] = {
       url: e.url, title: e.title, summary: e.summary, model: e.model,
       timestamp: e.timestamp, version: "1.0",
       stats: e.stats || { input: 0, output: 0 }, type,
       ...(e.style ? { style: e.style } : {}),
   };
   ```

**Test a afegir** — `tests/cache.test.mjs`:

- Nom: `cache: desfer restaura style i stats`
- `saveSummaryCache("https://x.com", "T", "R", "m", 11, 22, "summary", "bullets|long")`
- `const [entry] = await listCachedSummaries()` → `entry.style === "bullets|long"` i
  `entry.stats.input === 11`
- `await deleteSummaryCache("https://x.com", "summary")`
- `await restoreSummaryCacheEntries([entry])`
- `const back = await getSummaryCache("https://x.com", "summary")`
  → `back.style === "bullets|long"` i `back.stats.input === 11`
- Per què falla abans: `entry.style`/`entry.stats` són `undefined`; després de
  restaurar, `getSummaryCache` retorna l'entrada sense `style` i amb stats 0.

**Verificació:** `node --test tests/cache.test.mjs` i `npm run check`.

---

### T06 — Actualitzar models: clau crua i sense paginació

> **Revisió 2026-11-16 — puja a mig-baix.**
> - **Efecte no esmentat:** sense paginació, els favorits que cauen a la pàgina
>   2 s'esborren com a «obsolets» (`settings-models.js:277-285`). Per això és
>   pèrdua de dades de l'usuari, no només una llista incompleta.
> - Afegeix `pageSize=1000` a la URL i mantén el bucle de paginació.
> - **Forat al fix proposat:** el `unshift(DEFAULT_MODEL_ID)` queda fora del
>   `if (removed.length > 0)`, i la UI (`:306`) mostraria un favorit que no
>   s'ha desat. Desa també quan s'ha afegit el model per defecte.
> - No s'ha pogut comprovar en viu quants models retorna l'API (sense clau).

**Severitat:** ~~baix~~ mig-baix (funcional)
**Fitxer:** `options/settings-models.js:226-317`

**Símptomes.**
1. `refreshModels` llegeix `document.querySelector("#apiKey").value` sense
   `normalizeApiKey`. Una clau enganxada amb espais, cometes o prefix `Bearer`
   funciona a la resta de l'app (`settings-options.js:93`,
   `settings-backup.js:75`, `ui.js:994`) però aquí dona 401.
2. `GET https://generativelanguage.googleapis.com/v1beta/models` no pagina. La
   resposta pot portar `nextPageToken`; amb `pageSize` per defecte (50), la
   llista de models pot quedar incompleta.
3. El recompte d'obsolets és incorrecte si es re-afegeix el model per defecte:
   `removedCount = currentFavorites.length - cleanedFavorites.length`
   (`:287`) pot quedar a 0 encara que s'hagi eliminat un favorit obsolet.

**Fix proposat.**

```js
const apiKey = normalizeApiKey(document.querySelector("#apiKey").value);
// ...
const all = [];
let pageToken = null;
let pages = 0;
do {
    const qs = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models${qs}`, {
        headers: { "x-goog-api-key": apiKey }
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(`[011] ${err.error?.message || response.statusText}`);
    }
    const data = await response.json();
    all.push(...(data.models || []));
    pageToken = data.nextPageToken || null;
} while (pageToken && ++pages < 20);
```

Després filtra `all` com ara. I per als favorits:

```js
const removed = currentFavorites.filter(id => !validIds.has(id));
const cleanedFavorites = currentFavorites.filter(id => validIds.has(id));
if (!cleanedFavorites.includes(DEFAULT_MODEL_ID) && validIds.has(DEFAULT_MODEL_ID)) {
    cleanedFavorites.unshift(DEFAULT_MODEL_ID);
}
if (removed.length > 0) {
    await ext.storage.sync.set({ favoriteModels: cleanedFavorites });
}
const removedCount = removed.length;
```

**Test a afegir** — `tests/settings-integration.test.mjs` (usa
`tests/helpers/settings-harness.mjs`, que ja suporta `fetchHandler` i enregistra
`calls.fetches`):

- Nom: `refreshModels - normalitza la clau i pagina la llista`
- `loadSettings({ sync: { modelName: "gemini-2.0-flash" }, fetchHandler: ... })`
- `fetchHandler(url)`:
  - 1a crida: `{ models: [{ name: "models/gemini-2.0-flash",
    displayName: "Gemini 2.0 Flash", supportedGenerationMethods: ["generateContent"] }],
    nextPageToken: "tok2" }`
  - 2a crida: `{ models: [{ name: "models/gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro", supportedGenerationMethods: ["generateContent"] }] }`
- `document.querySelector("#apiKey").value = "  AIzaTEST  \n"`
- `document.querySelector("#refreshModels").click(); await h.flush();`
- Assercions:
  - `h.calls.fetches.length === 2`
  - `h.calls.fetches[0].headers["x-goog-api-key"] === "AIzaTEST"`
  - la 2a URL inclou `pageToken=tok2`
  - `(await h.storage.local.get("availableModels")).availableModels` conté
    `gemini-2.5-pro`
  - el text de `#refreshModelsStatus` no comença per `✗`
- Per què falla abans: només 1 crida, la capçalera porta els espais i no
  s'inclou el model de la segona pàgina.

**Verificació:** `node --test tests/settings-integration.test.mjs` i
`npm run check`.

---

### T07 — Fuita de worker de pdf.js en timeout + PDF sense límit de mida

> **Revisió 2026-11-16 — el fix és incomplet:**
> - El timeout només cobreix `loadingTask.promise`; el bucle de pàgines
>   (`pdf-extract.js:203-219`) no té cap límit de temps (**N11**).
> - `TOO_LARGE` ja vol dir «500 pàgines» (`content.js:16`): el límit de mida
>   necessita un **codi d'error nou** (p. ex. `TOO_BIG_FILE`).
> - El camí d'URL d'`extractPdfText` no té cap cridant en producció; els camins
>   reals són `content.js:216-241` i el selector local `sidebar.js:269`
>   (vegeu també N10), que el fix no esmentava.

**Severitat:** baix (memòria)
**Fitxers:** `sidebar/pdf-extract.js:148-179` (timeout),
`sidebar/pdf-extract.js:124-140` (fetch per URL),
`sidebar/content.js:209-273` (descàrrega del PDF de la pestanya).

**Símptomes.**
1. Si guanya el `timeoutPromise`, es llança `TIMEOUT` sense cridar
   `loadingTask.destroy()`: el worker de pdf.js continua i la tasca queda viva.
2. Es descarrega el PDF sencer a memòria sense cap sostre (`arrayBuffer()`), tant
   al sidebar com a `extractPdfText(url)`.

**Fix proposat.**

1. Conserva `loadingTask` fora del `try` i destrueix-lo al `catch`:
   ```js
   let loadingTask = null;
   try {
       loadingTask = pdfjsLib.getDocument({ /* ... */ });
       // ...
   } catch (e) {
       try { await loadingTask?.destroy(); } catch { /* ignore */ }
       if (e?.code === "TIMEOUT") throw e;
       // ... resta igual ...
   }
   ```
2. Defineix `const MAX_PDF_BYTES = 100 * 1024 * 1024;` i comprova:
   - `content-length` abans de llegir, si existeix;
   - `buffer.byteLength` després de `arrayBuffer()` (el header pot faltar o mentir).
   Si supera el límit, llança un error amb `code: "TOO_LARGE"` i afegeix el cas a
   `pdfErrorMessage` perquè el missatge sigui clar («El PDF és massa gran…»).
   Fes el mateix a `pdf-extract.js` per al camí d'URL.

**Tests a afegir** — `tests/pdf-extract.test.mjs`:

- Amplia `makePdfjsMock` perquè la tasca retornada per `getDocument()` inclogui
  `destroy: () => { taskDestroyed = true; }` i exposi `_wasTaskDestroyed()`.
- Test: `extractPdfText: timeout durant loading destrueix loadingTask`
  - `makePdfjsMock({ loadingDelayMs: 200 })`, `timeoutMs: 50`
  - `await assert.rejects(..., err => err.code === "TIMEOUT")`
  - `assert.equal(mock._wasTaskDestroyed(), true)` (cal retornar el mock o
    capturar-lo fora).
- Test de mida: el camí d'URL necessita mock de `fetch`; pots testar només el
  camí de buffer amb un `Uint8Array` gran si implementes el límit també allà, o
  bé refactoritzar un helper `assertPdfSize(bytes, max)` i testar-lo. Com a
  mínim, testa el guard de `content-length` a `content.js` no és trivial (cal
  mock de `ext`); si no ho pots cobrir net, documenta-ho al commit i valida-ho
  manualment amb un PDF >100 MB.
- Per què falla abans: `_wasTaskDestroyed()` és `false`.

**Verificació:** `node --test tests/pdf-extract.test.mjs` i `npm run check`.

---

### T08 — `data-theme="undefined"` si s'esborra la clau del tema

> **Revisió 2026-11-16:** cap codi de l'extensió esborra `theme`; només s'hi
> arriba per DevTools o sync. Prioritat molt baixa; fix d'una línia correcte.

**Severitat:** ~~baix~~ molt baix (UI)
**Fitxer:** `theme.js:17-45`

**Símptoma.** En eliminar `theme` de `storage.sync` (neteja, sync entre
dispositius), el listener fa `applyTheme(undefined)`, que deixa
`data-theme="undefined"` i `data-actual-theme="undefined"`. El CSS no troba cap
tema i l'aparença queda trencada fins a recarregar.

**Fix proposat.** Al listener:

```js
applyTheme(changes[STORAGE_KEY].newValue || DEFAULT_THEME);
```

I, defensivament, a l'inici de `applyTheme`:

```js
theme = theme || DEFAULT_THEME;
```

**Test.** `theme.js` és un IIFE sense exports. Opcions:
- Extreure `applyTheme`/`initTheme` a un mòdul exportable és un canvi massa gran;
- O afegeix un test amb `tests/helpers/sidebar-harness.mjs` que carregui la
  sidebar, dispari un canvi de storage amb `newValue: undefined` i comprovi
  `document.documentElement.getAttribute("data-theme") === "system"`.
  Si el harness no exposa `onChanged` per a aquest cas, valida-ho manualment
  (DevTools → `chrome.storage.sync.remove("theme")`) i deixa constància al
  commit. Prioritza no trencar res: el canvi és d'una línia.

**Verificació:** `npm run check` + prova manual.

---

### T09 — Rutes Obsidian: dia local vs setmana UTC (i dia de stats UTC)

> **Revisió 2026-11-16:**
> - **Part 1 (setmana ISO):** confirmada i coherent amb els tests existents.
>   Només afecta plantilles amb `gggg`/`ww`; la per defecte és
>   `Resumir/YYYY-MM-DD`.
> - **Part 2 (dia de stats): apunta a codi mort.** `getDailyStats`
>   (`sidebar/stats.js`) no té cap cridant en producció i `dailyStats` no es
>   llegeix enlloc (vegeu **N07**). El «Avui» que veu l'usuari és a
>   `options/settings-stats.js:21-22`: aplica-hi el dia local allà, no a
>   `cache.js`. Fes la part 2 junt amb N07.

**Severitat:** baix (dades/UX)
**Fitxers:** `sidebar/utils.js:10-59` (`getISOWeekDate`, `formatObsidianPath`),
`sidebar/cache.js:304` (clau de dia), `sidebar/stats.js:11-28` (`getDailyStats`).

**Símptomes.**
1. `formatObsidianPath` calcula `YYYY/MM/DD/HH/mm` amb getters **locals**, però
   `gggg`/`ww` amb `getISOWeekDate`, que fa aritmètica **UTC** sobre
   `d.valueOf()`. A la mitjanit (UTC+1/+2) el dia ja és el nou però la setmana
   encara és l'anterior: la nota cau a la carpeta de la setmana equivocada.
2. `saveUsageStats` i `getDailyStats` fan servir el dia **UTC**: el comptador
   diari reinicia a la 1–2 h de la matinada local.

**Fix proposat.**

1. **No canviïs la semàntica de `getISOWeekDate`** (és exportada i els tests
   actuals li passen instants UTC com `2024-02-29T12:00:00Z`; reinterpretar-los
   amb getters locals trencaria els tests en zones UTC+13). En lloc d'això,
   afegeix un helper pur que calculi la setmana ISO a partir de la data de
   calendari, sense passar per cap `Date` instant:

   ```js
   /** Setmana ISO a partir d'any/mes/dia de calendari (mes 1-12). */
   function isoWeekFromYMD(year, month, day) {
       const date = new Date(Date.UTC(year, month - 1, day));
       const dayNumber = (date.getUTCDay() + 6) % 7;
       date.setUTCDate(date.getUTCDate() - dayNumber + 3);
       const firstThursday = date.valueOf();
       date.setUTCMonth(0, 1);
       if (date.getUTCDay() !== 4) {
           date.setUTCMonth(0, 1 + ((4 - date.getUTCDay()) + 7) % 7);
       }
       const week = 1 + Math.ceil((firstThursday - date) / 604800000);
       return { week, year: date.getUTCFullYear() };
   }
   ```

   A `formatObsidianPath`, deriva `YYYY/MM/DD/HH/mm` i `gggg/ww` de la **mateixa**
   data local:

   ```js
   const iso = isoWeekFromYMD(now.getFullYear(), now.getMonth() + 1, now.getDate());
   const tokens = {
       // ...
       'gggg': () => iso.year.toString(),
       'ww': () => iso.week.toString().padStart(2, "0"),
   };
   ```

   (`getISOWeekDate` es pot deixar com a àlies que crida `isoWeekFromYMD` amb
   `d.getFullYear()/getMonth()+1/getDate()`, però llavors els dos tests actuals
   de límit d'any s'han d'ajustar. La via menys invasiva és no tocar-la.)

2. Per a les stats, extreu un helper:
   ```js
   // sidebar/utils.js o stats.js
   function localDayKey(date = new Date()) {
       const y = date.getFullYear();
       const m = String(date.getMonth() + 1).padStart(2, "0");
       const d = String(date.getDate()).padStart(2, "0");
       return `${y}-${m}-${d}`;
   }
   ```
   Usa'l a `saveUsageStats` (`cache.js:304`) i a `getDailyStats`, comparant
   `localDayKey(new Date(ts))` amb `localDayKey()`. Exporta'l per testar-lo.
   Si prefereixes no tocar les stats en aquesta tasca, deixa-ho com a tasca
   separada: no barregis canvis.

**Tests a afegir** — `tests/utils.test.mjs`:

- Test **independent de la zona horària** (no depenguis del TZ del CI): passa un
  objecte amb getters locals i UTC deliberadament diferents:
  ```js
  const fake = {
      getFullYear: () => 2021, getMonth: () => 0, getDate: () => 4,
      getHours: () => 0, getMinutes: () => 30,
      getUTCDay: () => 0, getUTCDate: () => 3, getUTCMonth: () => 0,
      getUTCFullYear: () => 2021,
      valueOf: () => Date.UTC(2021, 0, 3, 22, 30),
  };
  assert.equal(formatObsidianPath("gggg-ww", fake), "2021-01");
  ```
  El 4 de gener de 2021 (dilluns local) és setmana 1 de 2021; el 3 de gener UTC
  (diumenge) és setmana 53 de 2020. El codi antic retorna `2020-53`.
- `isoWeekFromYMD` (si l'exportes): `isoWeekFromYMD(2021, 1, 4)` →
  `{ year: 2021, week: 1 }`; `isoWeekFromYMD(2021, 1, 3)` →
  `{ year: 2020, week: 53 }`; `isoWeekFromYMD(2024, 2, 29)` →
  `{ year: 2024, week: 9 }`.
- `localDayKey` (si l'afegeixes): `localDayKey(new Date(2021, 0, 4, 0, 30)) === "2021-01-04"`.

**Per què falla abans:** `formatObsidianPath` crida `getISOWeekDate(now)`, que fa
`new Date(now.valueOf())` i usa getters UTC; amb el fake retorna
`{ year: 2020, week: 53 }`. Els tests actuals de `getISOWeekDate` continuen
passant perquè no en canviem la semàntica.

**Verificació:** `node --test tests/utils.test.mjs` i `npm run check`.

---

### T10 — El check de `?key=` no veu `fetch()` multilínia

**Severitat:** baix (eina de seguretat)
**Fitxer:** `scripts/pre-release-check.mjs:191-205`

**Símptoma.** La comprovació recorre línia a línia i busca
`/fetch\s*\(.*[?&]key=/`. Un `fetch(\n \`...?key=...\`\n)` no es detecta. Al
repo hi ha exactament aquest cas a `sidebar/content.js:575-576` (clau pública
d'InnerTube de YouTube: no és un secret, però el check hauria de ser conservador).

**Fix proposat.** Extreu una funció pura i testable, p. ex.
`scripts/lib/security-checks.mjs`:

```js
/** Retorna [{ line, text, call }] de fetch() amb ?key= a la URL/convocatòria. */
export function findQueryKeyFetches(src) {
    const out = [];
    const re = /\bfetch\s*\(/g;
    let m;
    while ((m = re.exec(src))) {
        const chunk = src.slice(m.index, m.index + 500);
        if (/[?&]key=/.test(chunk)) {
            const line = src.slice(0, m.index).split("\n").length;
            out.push({ line, call: chunk.split("\n")[0].trim() });
        }
    }
    return out;
}
```

`pre-release-check.mjs` l'importa i l'aplica. Per al cas legítim de YouTube,
mete una excepció explícita i documentada (només per a `sidebar/content.js` i el
patró `youtubei/v1/get_transcript?key=`), amb un comentari al codi font
`// pre-release-check: allow — clau pública INNERTUBE de YouTube` o una llista
`ALLOWED` al script. No afegeixis una excepció genèrica per `?key=`.

**Test a afegir** — `tests/security-checks.test.mjs`:

- Detecta `fetch(` en una sola línia amb `?key=`.
- Detecta `fetch(\n "https://x/y?key=SECRET"\n)` (multilínia).
- Detecta `fetch(url, { })` amb `url = "https://x?api_key=..."`? (només si està
  dins dels 500 caràcters; si no, és fals negatiu acceptat).
- **No** detecta `fetch("https://x/y")` sense key.
- Per què falla abans: la implementació nova no existeix; el test falla a
  l'import. Després, `npm run prerelease` ha de continuar donant 19/19 gràcies a
  l'excepció de YouTube.

**Verificació:** `node --test tests/security-checks.test.mjs`;
`npm run build; npm run prerelease` → 19/19.

---

### T11 — Soroll de build i paràmetre mort

**Severitat:** chore
**Fitxer:** `scripts/build.mjs:139`, `:178-185`, `:238-240`, `:269-273`

**Símptomes.**
1. En construir chromium, `background.bundle.js` es passa a `extraFiles` i es
   copia **abans** de generar-lo (`:273` vs `:231-240`), cosa que imprimeix
   «⚠️ background.bundle.js not found» tot i que després es copia bé.
2. El paràmetre `excludeFiles` (`:139`) no s'usa mai; tots els cridadors passen
   `[]`.

**Fix proposat.**
- Treu `"background.bundle.js"` de l'array d'`extraFiles` de chromium (ja es
  copia explícitament a `:238-240`). O bé mou la generació abans de la crida;
  la primera opció és la mínima.
- Elimina `excludeFiles` de la signatura i de les crides (o implementa'l si es
  vol usar; no deixis paràmetres morts).

**Test.** No cal test unitari; verificació:
`npm run build 2>&1` sense cap `⚠️ ... not found`, i `npm run prerelease` 19/19.

---

### T12 — Robustesa i poliment (opcional)

**Severitat:** opcional
**Fitxers:** `sidebar/summary.js`, `sidebar/anki.js`, `sidebar/api.js`

> **Revisió 2026-11-16:** 12.1 apunta a una branca que no s'executa mai (vegeu
> **N09**: `callGeminiStream` retorna sempre números, mai `undefined`); arregla
> N09 en lloc d'això. 12.2 i 12.3 confirmats (12.3 reproduït:
> `[{"q":"a","a":"b"}] Notes [1]` → 0 targetes). 12.5 és codi mort (N07).

1. **Tokens fraccionaris** (`summary.js:613-614`): quan no hi ha
   `usageMetadata`, usa `Math.ceil(lastPromptText.length / 4)` i
   `Math.ceil(currentMetadata.summary.length / 4)` perquè `updateTokenStats`
   no rebi decimals.
2. **Aturada manual sense post-procés** (`summary.js:32-45`): el resum parcial
   es pinta amb `formatTextToFragment(partial, false)`; no aplica bionic ni
   `linkQuotes`/`linkYoutubeTimes`. Per coherència amb `summary.js:600-606`,
   passa `ctx.isBionicEnabled()` (i la fixació) i, si el tipus és prosa, crida
   els mateixos `link*` (només si `contentDiv` i `currentMetadata.url` són
   coherents). No ho facis si l'abort és d'una selecció o PDF local sense URL
   http(s): les funcions ja retornen d'hora.
3. **`parseAnkiCards` fragile** (`anki.js:15-31`): talla del primer `[` a
   l'últim `]`. Si el model afegeix prosa amb claudàtors després del JSON,
   `JSON.parse` falla i es diu que no hi ha targetes. Proposta conservadora:
   prova primer el text sencer; si falla, prova els talls candidats
   (`indexOf("[")`…`lastIndexOf("]")`) i, si encara falla, retorna `[]` com ara.
   Afegeix un test amb `[{"q":"a","a":"b"}] Notes [1]`.
4. **`buildFallbackList` i deduplicació de triggers** (`sidebar.js:865-869`):
   `lastTriggerTime` és global; dos triggers de tipus diferent en <500 ms es
   dedupliquen. No és un bug crític; si ho touches, fes que la deduplicació
   inclogui el tipus (`page`/`selection`) i afegeix test.
5. **`getDailyStats`/`saveUsageStats` en UTC**: vegeu T09.

Cada punt és un commit separat. Si no hi ha temps, T12 es pot deixar fora.

---

### T13 — `system_instruction.parts` com a array (opcional, baix risc)

**Fitxer:** `sidebar/api.js:68-79`

L'esquema documentat de Gemini és `"system_instruction": { "parts": [{ "text": "..." }] }`.
El codi envia `parts` com a objecte; funciona des de v1.1.5, probablement per la
lenitat del parser de protobuf JSON. És higiene, no un bug funcional.

**Canvi:** `parts: [{ text: systemPrompt }]`.

**Test** — `tests/api-stream.test.mjs`: amplia `mockFetch` perquè capturi
`opts.body` (parsejat) i afegeix un test que `body.system_instruction.parts` sigui
un array amb `text === systemPrompt`. Per què falla abans: és un objecte.
Verifica-ho amb una crida real si tens clau; si no, mantén el canvi com a
conformitat d'esquema.

---

### T14 — Claus òrfenes de mapa conceptual (decisió de producte)

**Fitxers:** `sidebar/summary.js:179-208`, `options/settings.js:11-22`,
`options/settings-backup.js:28-29`, `options/settings.html`.

`conceptMapDepth`, `conceptMapBranches` i `conceptMapShowDescriptions`
s'alimenten de `storage.sync` i es passen a `buildConceptMapPrompt`, però no són
a `ALL_CONFIG_KEYS` ni tenen UI: només es poden fixar important un JSON de
còpia de seguretat. `conceptMapAutoExpand` es llegeix a `summary.js:180` i no
s'usa enlloc més (tampoc no l'usa `conceptmap.js`).

**Opcions (tria'n una; no barregis):**
- A) Afegeix els controls a `options/settings.html` + `settings-options.js` +
  `ALL_CONFIG_KEYS` + valors per defecte, i usa `autoExpand` a
  `renderMarkmapInteractive` (passar-lo com a opció) o elimina'l.
- B) Elimina les lectures de `summary.js` i les validacions del backup i
  hardcodeja els valors actuals (4/6/true), documentant-ho.

La recomanació és **B** si no hi ha hagut mai UI (superfície morta), o **A** si
el producte vol que l'usuari ho configuri. Demana confirmació abans
d'implementar-ho; no ho facis dins del lot de bugfixes.

---

## 3. Ordre, commits i verificació

Un commit per tasca, missatges en l'estil del repo (`fix:`, `chore:`, `test:`,
`docs:`; en català, imperatiu/descriptiu):

| Ordre | Tasca | Commit suggerit |
|-------|-------|-----------------|
| 1 | T01 | `fix: el guard SSRF bloqueja també IPv6 (loopback, ULA, link-local, mapped)` |
| 2 | T02 | `fix: el panell Anki desat no ofereix regenerar sense el text de la pàgina` |
| 3 | T03 | `fix: el runner de tests no pot acabar en èxit si node no s'executa` |
| 4 | T04 | `fix: serialitza saveUsageStats per no perdre estadístiques simultànies` |
| 5 | T05 | `fix: desfer de l'historial restaura l'estil i els tokens` |
| 6 | T06 | `fix: actualitzar models normalitza la clau i pagina la resposta` |
| 7 | T07 | `fix: destrueix la tasca de pdf.js en timeout i limita la mida del PDF` |
| 8 | T08 | `fix: tema per defecte si s'esborra la preferència` |
| 9 | T09 | `fix: setmana ISO i dia de stats calculats amb la data local` |
| 10 | T10 | `test: el check de ?key= detecta fetch multilínia (amb excepció YouTube)` |
| 11 | T11 | `chore: treu el soroll del build i el paràmetre mort` |

Opcionals després: T12 (separat per punts), T13, T14 (amb confirmació).

Després de cada commit:

```powershell
npm run check
```

Abans de tancar el lot:

```powershell
npm run build
npm run prerelease      # 19/19
npm run vendor:verify
```

**No facis `git push`, tags ni releases** sense confirmació explícita de
l'usuari (regla del repo). No toquis `package-lock.json` si no és intencionat.

---

## 4. Criteris d'acceptació (checklist)

- [ ] T01: `isPrivateOrReservedIP` exportada; tests IPv6 (loopback, ULA,
      link-local, multicast, mapped, NAT64, 6to4) i IPv4; `npm run check` verd.
- [ ] T02: la branca Anki de caché passa `canGenerateMore: false`; test nou;
      el camí en viu conserva els botons.
- [ ] T03: `exitCodeFor` amb tests; `npm test` continua executant tots els tests.
- [ ] T04: dos `saveUsageStats` simultanis → `articles: 2`, 2 entrades, dia 2.
- [ ] T05: desfer restaura `style` i `stats`.
- [ ] T06: clau amb espais funciona; 2 pàgines paginades (2 `fetch`).
- [ ] T07: timeout destrueix `loadingTask`; límit de mida amb error clar.
- [ ] T08: esborrar `theme` deixa `data-theme="system"`.
- [ ] T09: `formatObsidianPath` amb data local/UTC diferent dona la setmana
      local; (opcional) `localDayKey`.
- [ ] T10: el check veu `fetch()` multilínia i `npm run prerelease` segueix 19/19.
- [ ] T11: build sense `⚠️ ... not found`; sense paràmetre mort.
- [ ] `npm run lint` → 0 avisos; `npm test` → tot verd.
- [ ] Cap manifest editat a mà; cap versió/tag tocats.
- [ ] Si el lot es publica: `docs/CHANGELOG.md` amb l'entrada d'usuari de T02
      (i T06/T08/T09 si es consideren rellevants) + `node scripts/update-changelog-html.mjs`.
- [ ] Esborra o mou aquest fitxer (`AUDIT-TASKS.md`) en tancar el lot.

---

## 5. Falsos positius: NO ho arreglis

Aquestes coses es van investigar i **no** són bugs (o no ho són amb l'abast
actual). No els dediquis temps:

1. **`textFragmentUrl` i les comes** (`sidebar/utils.js:123-135`): el comentari
   diu que cal escapar `,`, però `encodeURIComponent(",")` ja retorna `%2C`, i
   `&` ja retorna `%26`. Afegir un `replace(/,/g, "%2C")` **double-encodaria**.
   L'únic escape necessari és `-` → `%2D`, que ja es fa.
2. **`pdf-viewer.js:203-205` (`pageInput` sense guard de `pdfDoc`)**: el footer
   (`#footer`) està amagat fins que el PDF carrega (`pdf-viewer.js:166-168`), i
   el keydown ja té guard a `:248`. No és abastable per l'usuari. Oposar un
   `if (!pdfDoc) return;` és opcional i no cal test.
3. **`AbortSignal.any` fallback** (`sidebar/api.js:99-101`): els manifests
   requereixen Firefox 142 / Chrome 142; `AbortSignal.any` existeix des de
   Firefox 124 / Chrome 116. No cal canviar-ho.
4. **`innerHTML`**: no se n'usa enlloc amb dades dinàmiques (verificat amb
   `rg`; el check de `prerelease` passa). No hi ha superfície XSS coneguda al
   render.
5. **`background.bundle.js` a l'arrel**: és un artefacte gitignored, no un
   fitxer versionat.

---

## 6. Idees obertes (no implementar sense decisió)

- **SSRF per redireccions**: el cos no es llegeix si la URL final és privada,
  però el GET intermedi ja s'ha fet. Una solució completa requereix seguir
  redireccions manualment i validar cada salt; a Chromium les respostes de
  redirect amb `manual` són opaques i no donen `Location`. Risc residual baix
  (GET sense credencials, cos descartat). Documentar, no implementar sense
  disseny.
- **Bloqueig de stats entre finestres**: T04 resol el mateix context; una
  solució multi-finestra necessitaria un únic escriptor (background) o un
  mutex a `storage.session`. Fora d'abast.
- **`convert` de PDF gran**: a més del límit, es podria fer streaming a
  `arrayBuffer` amb `reader.read()` i tallar en arribar al màxim, per no
  reservar 100 MB de cop. Millora, no bug.
- **`conceptMapAutoExpand`**: si es decideix mantenir la config, cal connectar-lo
  a `renderMarkmapInteractive` (avui no s'usa enlloc).

---

## 7. Evidència reproduïble

```powershell
# T01 — IPv6 amb claudàtors
node -e "for(const u of ['http://[::1]/','http://[fe80::1]/','http://[fc00::1]/','http://[::ffff:127.0.0.1]/','http://127.0.0.1/']){const h=new URL(u).hostname;console.log(u,'→',JSON.stringify(h))}"

# T02 — el panell Anki desat no té text de pàgina
rg -n "canGenerateMore|__ankiPageText|buildAnkiCtx" sidebar/summary.js sidebar/anki.js sidebar/history.js

# T03 — sortida amb èxit si spawnSync falla
rg -n "process.exit\(result.status" scripts/run-tests.mjs

# T04 — RMW sense cua
rg -n "saveUsageStats" -A 40 sidebar/cache.js

# T05 — el que es desa/restaura
rg -n "listCachedSummaries|restoreSummaryCacheEntries" -A 30 sidebar/cache.js

# T06 — clau crua + una sola pàgina
rg -n "apiKey|nextPageToken|pageSize" options/settings-models.js

# T07 — timeout sense destroy
rg -n "loadingTask|timeoutPromise|destroy" sidebar/pdf-extract.js

# T10 — regex d'una línia
rg -n "key=" scripts/pre-release-check.mjs
rg -n "get_transcript\?key" sidebar/content.js
```

---

## 8. Revisió 2026-11-16: punts nous (N01–N15)

Font: segona passada d'auditoria (agent Fable, només lectura; `npm test` 835 OK
i `npm run lint` 0 avisos en començar). Cada punt indica si s'ha **reproduït**
amb un script o només **verificat per lectura**. Segueixen la regla 9 de §0.2:
no s'han arreglat de passada.

### 8.1 Punts nous

**N01 — L'estat compartit `currentMetadata` es corromp entre generacions**
(mig-alt, reproduït)
- On: `sidebar/summary.js:359-364` i `:479` (cap comprovació d'avortament
  després dels `await`); `sidebar/sidebar.js:65-75` i `:601-605` (les pestanyes
  de tipus no es bloquegen mentre es genera).
- Cas A: «Resumir» amb extracció lenta, s'atura, i comença «Resumir la
  selecció». La generació vella es desperta i trepitja la nova. Reproduït: es
  desa `{url:"https://example.com", type:"summary", summary:"BBB"}` en lloc de
  `seleccio:…` / `"AAA BBB"`. La memòria cau de la pàgina queda enverinada.
- Cas C: clicar una pestanya de tipus durant l'streaming. Reproduït: es desa
  `{type:"deepdive", summary:"RESUM ANTIC DESAT. DEEP-2"}`.
- Fix: acumular la sortida en una variable local i escriure a `currentMetadata`
  només si la generació és la vigent (comprovar `signal.aborted` després de
  cada `await`); desactivar `#type-tabs` i els botons de repòs mentre es genera.
- Pla: primer el guard de les pestanyes (fàcil, tanca el cas C); després la
  refactorització de l'estat (cas A) amb test de regressió.

**N02 — Una resposta buida o bloquejada es dona per bona** (mig, reproduït)
- On: `sidebar/api.js:151-155`; no hi ha cap referència a `finishReason`,
  `blockReason` ni `promptFeedback` al codi.
- Reproduït: es desa `summary:""`, s'anuncia «Resum complet.», no surt cap
  error i es compta a les stats. A l'Historial queda una entrada que en obrir-la
  diu «No s'ha trobat l'entrada» (`listCachedSummaries` només mira `timestamp`).
- Fix: si no arriba text, llançar un error amb el motiu (`blockReason` /
  `finishReason`) i no desar res.

**N03 — Detecció de connector per subcadena d'URL** (mig, per lectura)
- On: `sidebar/content.js:812` (`tabUrl.includes("x.com")`), també `:283`,
  `:308`, `:794`.
- `vox.com`, `linux.com`, `nginx.com`, `dropbox.com` o `wix.com` contenen
  `x.com`. Hi entra la branca de Twitter, `extractTwitterOG`
  (`extractors.js:37`) retorna `og:description`, i el `if (!text)` de `:843`
  salta Readability: el resum es fa només de la metadescripció, sense avís.
- Fix: comparar `new URL(tabUrl).hostname` (igual o acabat en `.x.com`).
  Test a `tests/content.test.mjs`.

**N04 — Els triggers arriben a totes les finestres i `pendingSummary` no
caduca** (mig-baix, per lectura)
- On: `background.js:99-105`, `sidebar/sidebar.js:887-900`.
- `runtime.sendMessage` i `storage.onChanged` arriben a totes les barres
  obertes i el `url` del missatge s'ignora. Amb dues finestres, la drecera fa
  resumir també la pestanya de l'altra, que s'envia a Gemini sense que ningú ho
  hagi demanat. Si `open()` falla, la selecció queda a `storage.local` i es
  resumeix sola la propera vegada que s'obre la barra.
- Fix: incloure `windowId` i `ts` al missatge; ignorar-lo si és d'una altra
  finestra o té més de ~10 s.

**N05 — Extracció completa sense que l'usuari hagi demanat resumir**
(mig-baix, per lectura)
- On: `sidebar/sidebar.js:1021-1024` (preload en obrir; el race de 2 s no
  cancel·la res) i `sidebar/summary.js:339` (re-extracció en cada resum servit
  de memòria cau).
- Conseqüències: un HEAD a la URL, la descàrrega i el parseig del PDF, el fetch
  de l'article de HN, i a YouTube un clic al botó CC, `scrollTo(500)` i
  l'obertura del panell de transcripció (`content.js:493-500`, `:723-738`).
- Fix: preload només per al camí barat (Readability); en cache hit, extreure el
  text quan es premi «Veure el text enviat». Requereix decisió d'UX (latència
  del primer clic).

**N06 — «Generar més» / «Afinar» d'Anki, de segona** (baix-mig)
- On: `sidebar/anki.js:421-487`. No trunca per model (pot donar 400 en pàgines
  llargues), no té fallback de models, no compta a les stats, i les targetes
  afegides no es desen a la memòria cau: es perden en reobrir.

**N07 — Codi mort d'estadístiques** (baix)
- `getDailyStats` (`sidebar/stats.js`) no té cap cridant en producció.
  `dailyStats` s'escriu (`cache.js:304-308`) i s'esborra
  (`settings-stats.js:106`), però no es llegeix enlloc. `docs/DEV-CONTEXT.md:62`
  i `ARCHITECTURE.md:76` encara el descriuen com a «quota».
- Fix: esborrar-ho (amb els tests associats) i actualitzar els 2 docs; aplicar
  el dia local a `computeUsageSummary`/`settings-stats.js` (vegeu T09.2).

**N08 — `usageHistory` desa títol i URL que ningú llegeix** (baix, privadesa)
- On: `sidebar/cache.js:287-297`. `computeUsageSummary` no fa servir cap dels
  dos camps. Fins a 1.000 entrades sense caducitat (la memòria cau en té 30
  dies), i sobreviuen a «esborrar l'historial».
- Fix: deixar de desar-los. Si toca privadesa, revisa `docs/PRIVACY_POLICY.md`.

**N09 — Fallback de tokens inabastable** (baix)
- `callGeminiStream` sempre retorna números (`?? 0`, `api.js:198-202`), així
  que `apiUsage?.inputTokens ?? estimació` (`summary.js:613`) no estima mai.
  Sense `usageMetadata` es registren 0 tokens.
- Fix: retornar `null` als camps absents; ajustar tests. Substitueix T12.1.

**N10 — PDF local: es codifica a base64 abans de mirar la mida** (baix,
rendiment)
- On: `sidebar/sidebar.js:4-11`, `:269-296`. Concatenació caràcter a caràcter i
  3–4 còpies en memòria, per acabar fallant per la quota de `storage.session`.
- Fix: saltar-se el visor si `file.size` supera uns 7 MB.

**N11 — El «timeout global» del PDF no cobreix l'extracció** (baix)
- Vegeu T07: `pdf-extract.js:148-169` (timeout) contra `:203-219` (bucle de
  pàgines sense límit de temps). Tracta-ho dins de T07.

**N12 — `npm run release:source` no és portable a Windows** (baix, per
lectura, no executat)
- Fa servir `mkdir -p` i `$npm_package_version`; `npm config get script-shell`
  dona `null` (cmd.exe). `CLAUDE.md` el prescriu a cada pujada a AMO.
- Fix: un script de Node.

**N13 — Onboarding: un 429 o un 5xx en verificar impedeix desar la clau**
(baix)
- On: `sidebar/api-key.js:31-32`, `sidebar/ui.js:1002-1006`. Un 429 demostra que
  la clau és vàlida. Fix: dos casos a `describeKeyCheck`.

**N14 — Patrons `$` a `String.replace` en exportar** (baix, reproduït)
- On: `sidebar/utils.js:99-103`, `:110-114`. `"preu $$5 i $&"` surt com
  `"preu $5 i {{summary}}"`. Afecta LaTeX (`$$…$$`).
- Fix: `replace(re, () => valor)`. Test de regressió.

**N15 — Documentació desalineada** (baix)
- `docs/SECURITY.md` diu `type="password"`; el codi fa servir un camp de text
  amb màscara CSS (`sidebar/api-key.js:65-79`).
- `docs/SECURITY.md` afirma una denylist SSRF que per a IPv6 no funciona (T01).
- Corregeix-ho junt amb T01 i comprova les «quatre superfícies» de `CLAUDE.md`.

També a `AUDIT-TASKS.md` §5, núm. 3: la branca `: signal` d'`api.js:101` és
codi mort i es pot esborrar (matís al fals positiu, no és un bug).

### 8.2 Dificultat i risc de regressió

Escala: **Fàcil** (≤1 h, un fitxer, test trivial) · **Mitjà** (mig dia, diversos
fitxers o cal disseny/test no trivial) · **Difícil** (≥1 dia, arquitectura,
risc de regressió o decisió de producte).

| Punt | Dificultat | Justificació | Risc |
|------|-----------|--------------|------|
| T01 (versió simple) | Fàcil | Un fitxer, rebutjar IP literals, tests de taula | Baix |
| T01 (parser complet) | Mitjà | ~60 línies amb casos límit i 3 forats | Mig |
| T02 | Fàcil | Una línia més test amb el harness existent | Baix |
| T03 | Fàcil | Funció pura més test | Baix |
| T04 (cua) | Fàcil | Embolcall, però no resol el cas real | Baix |
| T04 (`navigator.locks`) | Mitjà | Fallback per a Node i test amb dos contextos | Baix |
| T05 | Fàcil | Dos camps a dos llocs | Baix |
| T06 | Mitjà | Bucle, favorits i test d'integració | Mig (toca favorits) |
| T07 + N11 | Mitjà | Tres camins de descàrrega, codi d'error nou, timeout real | Mig |
| T08 | Fàcil | Una línia | Baix |
| T09 part 1 | Fàcil | Helper pur més test | Baix |
| T10 | Fàcil | Funció, excepció i test | Baix (trenca `prerelease` sense l'excepció) |
| T11 | Fàcil | Neteja | Baix |
| T12.2 / T12.3 | Fàcil | Canvis locals | Baix |
| T13 | Fàcil | Una línia; cal provar-ho amb clau real | Baix-mig |
| T14 | Fàcil (B) / Difícil (A) | B és esborrar; A és UI més decisió de producte | Baix (B) |
| N01 | **Difícil** | Toca el nucli de `startSummary` i l'estat compartit amb `sidebar.js` | **Alt** |
| N02 | Mitjà | Parsejar `finishReason`, error nou, no desar, decidir el fallback | Mig |
| N03 | Fàcil | Helper de hostname a 4 branques | Baix |
| N04 | Mitjà | Background, sidebar i tests de tots dos | Mig |
| N05 | Mitjà | Decisió d'UX sobre el preload | Mig |
| N06 | Mitjà | Reutilitzar truncament i fallback, persistir a la memòria cau | Mig |
| N07 | Fàcil | Esborrar codi i tests associats, 2 docs | Baix |
| N08 | Fàcil | Treure 2 camps | Baix |
| N09 | Fàcil | `null` en lloc de 0 i ajustar tests | Baix |
| N10 | Fàcil | Un guard de mida | Baix |
| N12 | Fàcil | Script de Node | Baix |
| N13 | Fàcil | Dos casos a `describeKeyCheck` | Baix |
| N14 | Fàcil | Replacement amb funció | Baix |
| N15 | Fàcil | Docs | Baix |

### 8.3 Ordre recomanat (substitueix §0.4 i §3)

1. **N03, T02, N02** — errors visibles per a l'usuari, barats i aïllats.
2. **N01** — el de més valor, risc alt: primer el guard de les pestanyes de
   tipus, després la refactorització de l'estat amb test de regressió.
3. **T01 (versió simple)** i tot seguit corregir `SECURITY.md` (N15).
4. Lot de fixos fàcils, un commit cadascun: **T03, T05, T08, N09, N14, N10, N13**.
5. **T06** (esborra favorits; puja de prioritat).
6. **N07 amb T09** (esborrar codi mort i aplicar el dia local a
   `settings-stats.js`), després **N08**.
7. **N04**, i després **T04 amb `navigator.locks`**.
8. **T07 amb N11**, **N05**, **N06**.
9. Eines i higiene: **T10, T11, N12, T13**.
10. Opcionals: **T14 (B)** i la resta de **T12** (12.2, 12.3).

Ja són al `docs/BACKLOG.md` i no es dupliquen aquí: accions de GitHub fixades
per SHA, Dependabot, Node 20 a la matriu de CI, lint de `scripts/`.
