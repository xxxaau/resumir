# Pla de millora UI/UX

Pla d'execució per millorar totes les interfícies (barra lateral, configuració,
visor PDF, mapa conceptual, Anki, historial, punts d'entrada i web). Sorgit de
l'auditoria del 2026-10-11 (tres auditories de codi, recerca de competidors i
guies, captures amb Playwright sobre Chromium) i revisat contra el codi per un
segon revisor.

> **Estat viu:** aquest document només conté feina **pendent**. Quan una fase o
> un ítem es completa, es treu d'aquí (el registre és `CHANGELOG.md` + git), igual
> que amb `BACKLOG.md`. No s'hi fixen números que canvien sols (nombre de botons,
> amples en px, versions, límits de quota): consulta el codi.

**Limitacions de l'auditoria:** Firefox no s'ha provat en viu (només Chromium) i
no s'ha fet cap prova amb lector de pantalla. No avaluats: el rendiment de la
neteja de memòria cau (llegeix tot l'storage local) i el contingut de la secció
d'historial de canvis de la configuració.

## Diagnòstic

1. **El resultat no és fiable de mantenir.** Lectura biònica, l'historial i el
   fallback de model poden substituir, exportar o desar una cosa diferent de la
   que l'usuari veu.
2. **Barra d'eines plana i sense etiquetes.** Botons d'icona de colors diferents,
   sense grups (generar / exportar / vista) ni salt de línia. Amb tots els plugins
   actius desborda a amplades típiques de panell i l'engranatge de configuració
   queda fora de pantalla. Una instal·lació nova en mostra només tres, així que
   afecta sobretot usuaris avançats; a l'usuari nou li falta «Copiar» (desactivat
   per defecte).
3. **Estats buits i de càrrega pobres.** El panell en repòs és blanc; el peu mostra
   «0.0s 0.0↓ 0.0↑» abans de res; la càrrega són tres punts sense etapa; els
   errors porten codis interns i de vegades text en anglès.
4. **La configuració no desa el que sembla desar.** Els interruptors de plugins
   actualitzen el menú lateral a l'instant però no es persisteixen fins a «Desar»
   (hi ha un botó per pestanya), sense avís de canvis pendents. A més no és
   responsiva.
5. **Dos sistemes de tokens que han divergit.** La barra lateral es va corregir
   per a AA; la configuració no. Crema i Fosc fallen contrast en botons, enllaços
   i text atenuat.

**A preservar:** construcció de DOM segura (sense `innerHTML` amb contingut del
model), CSP sense handlers inline, `prefers-reduced-motion` global, l'overlay del
mapa (diàleg modal amb trampa de focus), la recàrrega automàtica en desar la
clau, el versionat de prompts que no trepitja personalitzacions i el toolbar
mínim per defecte.

## Nivell 0 — Bugs que trenquen l'experiència

Un commit i un test de regressió per bug (`CLAUDE.md`: el test ha de fallar sense
el fix). Els marcats ✔ s'han verificat directament al codi; la resta porten
referència de línia dels auditors. **Els bugs 0.1–0.15 ja estan corregits** (vegeu
`git log` i `LEARNINGS.md`); aquí només queda el que en penja:

- **0.2 (navegació de l'historial):** la integritat de dades ja està resolta
  (Copiar/Obsidian exporten l'entrada visible); queda redissenyar la navegació
  (barra d'eines visible en veure una entrada, «Tornar a l'historial» només si
  s'hi ha vingut). Es fa amb les pestanyes per tipus del Nivell 3.
- **0.6:** desactivar els generadors mentre falta la clau, amb tooltip; es fa amb
  l'onboarding de 2.2.
- **0.14:** etiqueta/tooltip «Regenerar» quan es veu la versió de memòria cau.

## Nivell 1 — Guanys ràpids (resta)

La Fase C (contrast i accessibilitat de base) està feta; vegeu `git log` i el
test `quality-contrast`, que vigila AA amb la llista de fallades buida. Queda:

**Decisió sobre `shared/tokens.css`:** no es fa. Els dos fitxers de tema (barra
lateral i configuració) no divergeixen per descuit sinó pel disseny (fons i
primari diferents), i el que importava —que cap parell de colors falli AA— ja ho
garanteixen els tests. Un fitxer compartit només valdria la pena si es vol
unificar el disseny dels dos.

### Pendent d'accessibilitat

- **Focus a la resta de panells:** el panell de text enviat, els subpanells de
  configuració (`navigateToTab`) i el visor PDF encara no mouen el focus a
  l'encapçalament ni el retornen al disparador.
- **`scroll-padding`** perquè la barra fixa i el peu no tapin l'element enfocat
  (WCAG 2.4.11), quan la barra sigui enganxosa (Fase D, 2.1).
- **Visor PDF:** paleta fixa que ignora el tema (ara no passa pel mateix control
  de contrast) i sense `:focus-visible`.
- **Mapa:** els interruptors de nodes (r=8) i les vores per sota de 3:1; la roda
  sempre fa zoom (cal `ctrl` per al zoom i desplaçar amb la roda); només ratolí
  (sense pointer/touch).

### Pendent de microcopy

- Errors 400 de Google arriben en anglès: afegir branca i «Detalls» plegable.
- Codis interns (`[007]`, `[PDF-013]`) al final del missatge i en gris; `[003]`
  duplicat.
- Mapa conceptual i visor PDF: «Desplega tot / Replega tot» →
  «Desplegar-ho tot / Plegar-ho tot»; «Apropar/Allunyar» vs «Ampliar/Reduir»
  unificat; «Tancar», «Tornar», «Configurar» ja en infinitiu.
- **Decisió pendent:** «Validació científica» i «Explica-ho fàcil» són noms de
  funcionalitat, no verbs de botó; dir explícitament si la regla de l'infinitiu
  s'hi aplica.
- Normalitzar «Validar / Validació / Validació científica» a un sol nom.

### Altres correccions petites

- Activar **Copiar** per defecte: l'usuari nou rep un resum sense cap acció
  visible per endur-se'l.
- Peu: ↑ enviats abans de ↓ rebuts, inicialitzar a «–», «De la memòria cau» en un
  encert; `title` amb el nom complet del model truncat.
- Visor PDF: nom del fitxer al títol, Esc no ha de tancar la pestanya, fletxes
  ignorades dins del camp de pàgina, ‹ › en lloc de ⏮ ⏭, no esborrar el PDF en
  recarregar.
- Context menu: `contexts: ["page","all"]` duplica entrades quan hi ha selecció;
  passar a `["page","frame"]` i «Resumir aquesta pàgina» / «Resumir la selecció»
  (l'entrada deixa de sortir en clic dret sobre enllaços i imatges).
- Web: «La clau i les dades no surten del navegador» no és exacte (el contingut va
  a Google); la mateixa frase és a `docs/COMUNICACIO.md:45`, font del to: canviar-les
  al mateix commit i revisar `PRIVACY_POLICY.md` i els textos de les botigues. Text
  honest: «Sense servidor propi: el contingut va directament del teu navegador a
  Gemini, amb la teva clau.»

## Nivell 2 — Canvis estructurals (resta)

La Fase D està feta en bona part (barra d'eines agrupada i fixa, onboarding amb
comprovació de la clau, estats de càrrega, renderitzador Markdown, configuració
responsiva, historial amb cerca/esborrar/desfer, pantalla General reordenada,
enllaços profunds, rutes neutres). Vegeu `git log`. Queda:

### 2.1 Barra d'eines

- «Aprofundir» continua sent un «+» a la barra (la resta d'icones de tipus ja
  són SVG).

### 2.4 Configuració

- **Revelació progressiva:** plegar els prompts sota «Personalitzar instruccions
  (avançat)» (la insígnia «Personalitzat» i el bloqueig de prompt buit ja hi són;
  els prompts per defecte no tenen variables, no cal llegenda).
- **Descripció detallada de cada plugin:** feta a totes les pàgines de plugin (bloc «Què fa i com configurar-lo»); queda la targeta **Resum** i els plugins que cap pàgina cobreix.
- **Revisió de la interfície de configuració amb Opus:** auditoria completa de
  `options/` (jerarquia, densitat, textos, a11y, mòbil/estret, coherència amb la
  barra lateral); les troballes es afegeixen aquí a sota.
- **Desat automàtic dels camps de text i sliders:** avui hi ha avís de canvis
  sense desar + `beforeunload`, però no desat automàtic; decidir si cal.

## Nivell 3 — Estratègia de producte

> **Estat (2026-10-11):** Fases A–D fetes i, de la Fase E, la procedència (amb text enviat),
> les pestanyes per tipus i l'avís de resum d'una altra pàgina (vegeu `git log`).
> Les cites «(p. N)» dels PDF web ja enllacen amb `#page=N` (als PDF locals encara no, el visor propi no té enllaç per pàgina). Els segells de temps de YouTube també hi són (camins B, C i text pre-renderitzat; el rascat del DOM encara no en porta). Format i llargada ja són preferències de la configuració de Resum (no hi ha selector a la barra lateral: els refinadors «Més curt/Més detall» cobreixen l'ajust puntual). Següent: cites verificades (L).
> Mètode: test de regressió primer, commit atòmic, `npm test` + `npm run lint` +
> `npm run dev:chromium` abans de commitejar, i treure del pla el que es completi.

La direcció és fer de Resumir el resumidor més **verificable**: el mercat ja ha
convertit en mínim el xat de seguiment i els segells de temps, i la diferència ara
és la confiança. Ordenat per relació impacte/esforç.

| Idea | Què veu l'usuari | Per què | Referència | Esforç |
| --- | --- | --- | --- | --- |
| Vinyetes amb cita verificada | Cada punt porta un ↗ que fa scroll i ressalta el passatge a la pestanya (`#:~:text=`); la cita es comprova literalment contra el text extret | Les cites inventades augmenten la falsa confiança; verificades, la calibren | Perplexity Comet; AAAI 2025 (Ding et al.) | L |
| Llengua de sortida independent | Els prompts ja forcen el català; només queda la sortida en altres llengües, que pertany a l'entrada d'i18n del backlog | Ajuda el posicionament «català primer» | Kagi Universal Summarizer | S |
| Importar/exportar configuració | JSON amb prompts i plantilles; la clau exclosa per defecte | Els prompts personalitzats són la inversió de l'usuari i només viuen a `storage.sync` (quota per element) | — | M |

**Relació amb el backlog:** els prompts editables, els proveïdors alternatius i la
i18n ja hi tenen entrada («Crear plugins propis», «Múltiples proveïdors»,
«Interfície multidioma»); aquí només se'n tracta l'impacte a la UI. El **xat de
seguiment** sobre el resum no hi és: és el patró més estès del mercat (Gemini,
Merlin, Recall, Comet) i mereix una entrada nova, però és esforç L i fora de
l'abast d'una millora d'UI.

## Ordre d'execució

Cinc fases; cada una deixa l'extensió publicable i no depèn de les següents,
excepte on s'indica.

1. **Fase A — Integritat del resultat: feta** (queden només els tres ítems
   enllaçats a la secció del Nivell 0, que van amb les fases B i D).
2. **Fase B — Configuració que no perd canvis: feta** (desat automàtic d'interruptors, ordre i tema; avisos de prompt per pestanya; historial de canvis; avís en buidar la memòria cau). Del 2.4 queda el desat automàtic dels camps de text i sliders, amb indicador de canvis pendents.
3. **Fase C — Contrast i accessibilitat: feta** (la resta, a la secció del Nivell 1). Falta una revisió amb lector de pantalla real durant el streaming.
4. **Fase D — Estructura (en bona part feta; vegeu el Nivell 2)** (2.1 barra d'eines, 2.2 onboarding, 2.3 estats, la resta
   de 2.4 (ordre, selector de models, revelació progressiva, enllaços profunds,
   rutes neutres), 2.5 responsiva, 2.6 historial). 2.1 i 2.2 primer: són el que
   veu un usuari nou. Captures noves per a les botigues després d'aquesta fase
   (`docs/SCREENSHOTS-GUIDE.md`).
5. **Fase E — Confiança** (Nivell 3). Començar per la línia de procedència i les
   pestanyes per tipus; les cites verificades només quan la procedència estigui
   consolidada.

Si la i18n del backlog s'aborda, fer-la **després** de la passada de microcopy de
la Fase C: traduir textos que encara s'han de reescriure duplica la feina.

**Prerequisit transversal:** una passada a Firefox abans de tancar la Fase D. La
barra lateral de Firefox sol ser més estreta i redimensionable, i `sidebar_action`
és per finestra.

**Regles del repositori:** tornar a executar `npm run dev:chromium` abans de cada
captura. Els bugs del Nivell 0 es corregeixen directament (un commit i un test de
regressió cadascun) i no van al backlog; en passar els Nivells 2–3 a
`docs/BACKLOG.md`, treure'n els números que canvien sols.

Documents que caldrà tocar a mesura que s'avanci: `docs/user-guide/GUIA-INICI.md`
(diu «Clica «Resum»» però és una icona; no esmenta el menú contextual ni
l'historial), `docs/CONCEPTMAP-FEATURES.md` (descriu un botó d'ajustar a la vista
que no existeix i una paleta antiga), `README.md` i `docs/SCREENSHOTS-GUIDE.md`.

## Annex — Altres troballes per superfície

Troballes que no surten als nivells de dalt, per no perdre-les.

| Superfície | Troballa | On | Sev. | Esforç |
| --- | --- | --- | --- | --- |
| Barra lateral | El selector de model mostra el model d'una entrada en memòria cau però la següent petició usa el desat | `summary.js:232-241` | Mitjana | S |
| Barra lateral | L'avís de prompt nou bloqueja l'acció: només es genera en clicar × (Tancar) | `sidebar.js:342-381` | Mitjana | S |
| Barra lateral | Aturar deixa el text parcial cru i permet exportar-lo sense marca «incomplet» | `summary.js:481-501` | Mitjana | S |
| Barra lateral | Obrir l'historial durant la generació amaga el botó d'aturar; el stream continua invisible | `history.js:13,24` | Mitjana | S |
| Barra lateral | Copiar i Obsidian exporten el JSON cru d'Anki i l'esquema del mapa | `sidebar.js:256-303` | Baixa | S |
| Barra lateral | El cost ja es pot calcular (`getCuratedModelInfo`) però només l'usen els tests | `api.js:24-47` | Baixa | S |
| Barra lateral | El mapa d'errors PDF està duplicat i ja ha divergit; no diu el límit de pàgines | `sidebar.js:228-234`, `content.js:259-267` | Baixa | S |
| Barra lateral | Sense `max-width` del text en panells amples; enllaços amb `word-break: break-all` | `sidebar.css:159,167` | Baixa | S |
| Barra lateral | CSS mort i regles duplicades (`#water-indicator`, `#timelineCleanerBtn`, `__rgba_primary_weak__`) | `sidebar.css:258-283,424,798` | Baixa | S |
| Configuració | Els valors per defecte de `systemPrompt`, `ankiPrompt` i plantilles es congelen en el primer desat | `settings-options.js:16-58` | Mitjana | M |
| Configuració | «Restaurar» sobreescriu un prompt llarg sense confirmació i, des de l'avís, desa tota la pàgina | `settings-options.js:168-212`, `settings.js:69-71` | Mitjana | S |
| Configuració | Botons Amunt/Avall amb el mateix nom per a tots els plugins; en pujar es perd el focus (es mou l'element enfocat), en baixar no, i en desactivar-se als extrems també | `settings-order.js:61-95` | Mitjana | M |
| Configuració | Un prompt massa gran fa fallar tot el desat amb un error genèric (quota per element de `storage.sync`) | `settings-options.js:72-81` | Baixa | S |
| Configuració | Les estadístiques d'ús es desen però no es mostren ni es poden reiniciar | `storage.local` | Baixa | M |
| Configuració | HTML de plugins duplicat; un registre únic de plugins evitaria la deriva | `settings.html`, `settings-sidebar.js` | Baixa | M |
| Historial de canvis | Entrades de desenvolupador (CI, npm, Defuddle), totes les versions desplegades, avís de seguretat enterrat | `settings.html:1252-1310` | Mitjana | S |
| Mapa conceptual | L'export PNG només captura els nodes desplegats (per defecte, nivells 0–1) sense dir-ho | `markmap-native.js:666-720` | Mitjana | M |
| Mapa conceptual | La roda sempre fa zoom: al trackpad no es pot desplaçar ni fer scroll del panell | `markmap-native.js:581-595` | Mitjana | S |
| Mapa conceptual | No hi ha botó d'ajustar a la vista; només mouse (sense pointer/touch) | `conceptmap.js:266-282` | Mitjana | S–M |
| Mapa conceptual | Pantalla completa impossible des d'un PDF local, amb un consell enganyador | `conceptmap.js:349-391` | Mitjana | M |
| Mapa conceptual | `confirm()` d'origen diferent salta gairebé sempre que es ve de l'historial | `conceptmap.js:398-405` | Baixa | S |
| Anki | Tornar a exportar duplica targetes; cada acció re-renderitza i esborra el camp «Afinar» | `anki.js:91-200,283-307` | Mitjana | M |
| Anki | Des de l'historial, «Genera més» i «Afinar» semblen actius però fallen | `history.js:101-106` | Baixa | S |
| YouTube | L'etiqueta de llengua enviada al model pot no correspondre a la transcripció descarregada | `content.js:350-370`, `extractors.js:197-201` | Mitjana | S |
| YouTube | `youtubePreferredLangs` es llegeix però cap UI l'escriu | `content.js:341-346` | Baixa | S |
| Punts d'entrada | Tooltip «Obre Resumir» quan en realitat obre i tanca; descripció del manifest massa estreta | `manifest.base.json:8,20` | Baixa | S |
| Web | Sense enllaç «Salta al contingut» | `web/src/_includes/base.njk` | Baixa | S |

## Fonts

- [Chrome sidePanel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) i [llançament del side panel](https://developer.chrome.com/blog/extension-side-panel-launch)
- [Chrome Summarizer API](https://developer.chrome.com/docs/ai/summarizer-api)
- [Gemini en Chrome](https://support.google.com/chrome/answer/16283624)
- [Firefox AI chatbot](https://support.mozilla.org/en-US/kb/ai-chatbot) i [Firefox Link Previews](https://blog.mozilla.org/en/firefox/firefox-ai/ai-link-previews-firefox/)
- [MDN — Sidebars](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/user_interface/Sidebars) i [Acorn Design System](https://acorn.firefox.com/latest/foundations/foundations-overview-zjsOvXKJ)
- [AMO: consentiment de recollida de dades](https://blog.mozilla.org/addons/2025/10/23/data-collection-consent-changes-for-new-firefox-extensions/)
- [Gemini API: límits](https://ai.google.dev/gemini-api/docs/rate-limits), [termes](https://ai.google.dev/gemini-api/terms) i [resolució d'errors](https://ai.google.dev/gemini-api/docs/troubleshooting)
- [Kagi Universal Summarizer](https://blog.kagi.com/universal-summarizer)
- [Readwise Ghostreader](https://docs.readwise.io/reader/guides/ghostreader/overview)
- [Glasp YouTube Summary](https://glasp.ai/features/youtube-summary)
- [Recall: augmented browsing](https://docs.recall.it/deep-dives/recall-augmented-browsing)
- [NN/g — Prompt controls](https://www.nngroup.com/articles/prompt-controls-genai/)
- [Shape of AI — Citations](https://www.shapeof.ai/patterns/citations)
- [Google PAIR — Explainability + Trust](https://pair.withgoogle.com/chapter/People%20+%20AI%20Guidebook%20-%20Explainability%20+%20Trust.pdf)
- [Ding et al., AAAI 2025 — cites i confiança](https://ojs.aaai.org/index.php/AAAI/article/view/34550)
- [IBM Research — puntuacions de factualitat i atribució](https://research.ibm.com/publications/facilitating-human-llm-collaboration-through-factuality-scores-and-source-attributions)
- [Deque — WCAG 2.2](https://dequeuniversity.com/resources/wcag-2.2)
- [Streaming accessible amb lectors de pantalla](https://azukiazusa.dev/en/blog/accessible-streaming-chat-ui)
