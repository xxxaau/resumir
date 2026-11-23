# Validació de la versió 2.7.3 (registre de treball)

- **Data del registre:** 2026-11-23
- **Versió objectiu:** `2.7.3` (encara **NO preparada**)
- **Base:** v2.7.2 (`33ee20c`) → `520db47` (37 commits a `main`)
- **Estat:** codi i tests tancats. No s'ha tocat `package.json`, cap manifest, cap tag
  ni s'ha fet cap publicació. La release es prepararà quan l'usuari ho demani.

Aquest document serveix perquè **un altre agent validi els canvis** i perquè **l'usuari
provi la versió** abans de preparar la release. Els canvis d'usuari són a
`docs/CHANGELOG.md`, secció `## [Pendent de publicar]`.

## 1. Què inclou

### Correccions i canvis visibles per a l'usuari

| Tema | Commit | Què s'ha de veure |
|---|---|---|
| Connectors per hostname (no subcadena d'URL) | `ea4d2ad` | `vox.com`, `dropbox.com`, `linux.com` ja no es tracten com a X |
| Anki desat no ofereix regenerar | `63c22c5` | Reobrir Anki desat: sense «Generar més»/«Afinar» |
| Resposta de Gemini sense text → error `[012]` | `f562206` | Missatge d'error, no resum buit desat |
| Pestanyes de tipus mentre es genera | `a720aec` | No carreguen res fins que acaba |
| Generació aturada no trepitja la següent | `acec5de` | Aturar i començar una altra: sense barrejar textos |
| Guard SSRF de l'article de HN | `6ec6949` | No descarrega IP literals, `localhost`, `.local`, `.lan`, hosts sense punt |
| «Desfer» de l'Historial | `18465d0` | Restaura format, llargada i tokens |
| Tema esborrat | `82bf0e2` | Torna al tema per defecte |
| Tokens sense `usageMetadata` | `54f4486` | S'estimen; no queden a 0 |
| Plantilles d'exportació | `97aea11` | `$`, `$&` i `{{…}}` es copien literals |
| PDF local gran (>7 MB) | `b35df44` | Sense visor propi, però el resum funciona |
| Clau amb 429 | `4db1727` | S'accepta la clau i s'avisa d'esperar |
| Actualitzar models | `f8f2e8b` | Normalitza la clau, pagina i no esborra favorits vàlids |
| Codi mort d'estadístiques | `e6ed44f` | Sense impacte d'usuari (neteja) |
| Setmana ISO i «Avui» locals | `0cfb3e5` | Rutes Obsidian `gggg`/`ww` i comptador diari correctes |
| Historial d'ús sense títol/URL | `d164dd2` | Privadesa: no es desen aquests camps |
| Triggers per finestra i caducitat 10 s | `2754ba2` | Dues finestres no es trepitgen |
| `saveUsageStats` serialitzat | `ba68114` | Dues generacions alhora no perden estadístiques |
| PDF: timeout i límit 100 MB | `d850b7a` | Error clar `[PDF-017]`, allibera el worker |
| Anki «Generar més» robust | `51129b2` | Truncament, fallback de model, persistència i stats |
| Preload barat + text font lazy | `d8d591e` | Obrir la barra no descarrega PDF/YouTube; cache hit no rellegeix |
| `system_instruction.parts` array | `a6df41d` | Higiene d'esquema (sense canvi visible) |
| Aturada parcial amb bionic i enllaços | `f7502bc` | El tros generat es veu com un resum complet |
| Anki amb prosa després del JSON | `f8a8850` | No es perden targetes (`[{"q":"a","a":"b"}] Notes [1]`) |
| Deduplicació de triggers per tipus | `7e97cc6` | Pàgina i selecció seguides no es descarten |

### Intern / eines (dev)

| Tema | Commit |
|---|---|
| Runner de tests: codi de sortida correcte | `5c6ce4e` |
| `docs/SECURITY.md` alineat amb el guard real | `c008eb9` |
| Check de `?key=` multilínia + excepció YouTube | `a67287d` |
| Build sense soroll ni paràmetre mort | `61f4eb0` |
| `release:source` portable (Windows) | `bb75d2c` |
| Configuració morta de mapa conceptual treta (4/6/true) | `ce391b6` |
| Lint cobreix `scripts/` i neteja de codi mort | `520db47` |
| Docs d'auditoria i backlog actualitzats | `4bba9f7`, `2c0c339`, `3a4f200`, `d52c13b`, `c1f3b91` |

## 2. Validació automàtica

Executar a l'arrel del repo:

```powershell
npm install          # només si cal
npm test             # esperat: 879 OK
npm run lint         # esperat: 0 avisos (ara inclou scripts/)
npm run vendor:verify # esperat: 3 hashes OK
npm run build        # esperat: 2 ZIP de contingut + cap "not found"
npm run prerelease   # esperat: 19/19
```

Notes:
- `npm run prerelease` necessita un `build` previ.
- `package-lock.json` apareix modificat (15 línies esborrades d'un `npm install` anterior):
  **no és intencionat; no el commitis**.
- Els tests de regressió nous es van verificar fent `git stash push -- <fitxer font>` i
  comprovant que fallaven sense el fix.

## 3. Proves manuals recomanades (usuari)

Carregar la build DEV (`npm run dev` → `build_firefox_dev/manifest.json` o
`build_chromium_dev/`) o la build de `npm run build`.

| # | Prova | Resultat esperat |
|---|---|---|
| 1 | Resumir una pàgina normal | Resum, tokens i entrada a l'Historial |
| 2 | Aturar a mig resum | Avís informatiu, text parcial amb bionic i enllaços |
| 3 | Aturar i resumir una selecció | No es barregen textos ni es desa el resum equivocat |
| 4 | Dues finestres, drecera en una | Només resumeix la finestra d'origen |
| 5 | Drecera de pàgina i selecció seguides | Les dues accions s'executen |
| 6 | Reobrir un Anki desat | Sense «Generar més»/«Afinar» |
| 7 | Anki en viu: «Generar més» i reobrir | Targetes noves persistents, compten a stats |
| 8 | Anki amb text extra després del JSON | Es mostren les targetes |
| 9 | PDF >100 MB | Error clar, sense carregar-lo sencer |
| 10 | PDF que triga | S'atura i no deixa el worker penjat |
| 11 | PDF local >7 MB | Sense visor, resum OK |
| 12 | Historial: esborrar i «Desfer» | Format, llargada i tokens restaurats |
| 13 | Actualitzar models amb clau amb espais | Llista completa, favorits intactes |
| 14 | Exportar Obsidian/Markdown amb `$` i `$$…$$` | Literals, sense alterar |
| 15 | Ruta Obsidian `gggg/ww` just després de mitjanit | Setmana correcta |
| 16 | Comptador «Avui» | Canvia a mitjanit local, no UTC |
| 17 | Fil de HN amb enllaç a IP/`localhost` | No es descarrega l'article |
| 18 | Esborrar `theme` de storage | Torna al tema per defecte |
| 19 | Obrir la barra en un PDF/YouTube | No descarrega PDF ni transcripció fins a demanar resum |
| 20 | Reobrir resum de cache | No rellegeix la pàgina; «Veure el text enviat» el carrega |
| 21 | Resposta buida/bloquejada de Gemini | Error `[012]` amb motiu |
| 22 | Mapa conceptual | Continua amb 4 nivells, 6 branques i descripcions |

## 4. Abans de preparar la release (NO fet encara)

1. Renomenar `## [Pendent de publicar]` a `## [2.7.3] - AAAA-MM-DD` a
   `docs/CHANGELOG.md` i executar `node scripts/update-changelog-html.mjs`.
2. Revisar les quatre superfícies públiques: `README.md`, «Sobre l'extensió»,
   `docs/CHANGELOG.md`, web (`web/src/*.njk`) i `docs/MARKETS-COPY.md`.
3. `npm version 2.7.3 -m "chore: release v%s"` (mai editar versions a mà).
4. `npm run build`, `npm run prerelease`, `npm run release:source`.
5. Publicar (tag/AMO/GitHub Release) **només amb confirmació explícita de l'usuari**.

## 5. Pendent conegut (no bloqueja)

- **N13:** si comprovar la clau falla per xarxa o 5xx, encara no hi ha el botó
  «Desar igualment» (decisió d'UX pendent).
- `AUDIT-TASKS.md` és el registre històric de l'auditoria; totes les tasques estan
  tancades i es pot esborrar o arxivar quan es tanqui la release.
