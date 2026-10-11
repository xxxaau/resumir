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
referència de línia dels auditors. El 0.12 i el 0.13 són de severitat menor (text
i script de build). **Els bugs 0.1–0.9, 0.14 i 0.15 ja estan corregits** (vegeu
`git log` i `LEARNINGS.md`); aquí només queden els de configuració i el que en
penja de la Fase A:

- **0.2 (navegació de l'historial):** la integritat de dades ja està resolta
  (Copiar/Obsidian exporten l'entrada visible); queda redissenyar la navegació
  (barra d'eines visible en veure una entrada, «Tornar a l'historial» només si
  s'hi ha vingut). Es fa amb les pestanyes per tipus del Nivell 3.
- **0.6:** desactivar els generadors mentre falta la clau, amb tooltip; es fa amb
  l'onboarding de 2.2.
- **0.14:** etiqueta/tooltip «Regenerar» quan es veu la versió de memòria cau.

| # | Problema | On | Impacte | Solució |
| --- | --- | --- | --- | --- |
| 0.10 ✔ | Els interruptors de plugins només fan `updateSidebar()`; res es desa fins a «Desar», sense guarda de sortida | `options/settings.js:79-86` | L'usuari activa plugins, tanca la pestanya i no passa res | Desat automàtic que escrigui només la clau de l'interruptor tocat (no la funció de desar global, que commiteja prompts i clau a mig editar); sliders i selects amb debounce per les quotes de `storage.sync`; avís «Desat» |
| 0.11 ✔ | Desar qualsevol pestanya posa a `false` els 4 avisos de prompt nou | `options/settings-options.js:66-70` | Es perden avisos que l'usuari mai ha vist | Netejar només el flag de la pestanya que es desa |
| 0.12 ✔ | «Buidar memòria cau» esborra les claus `summary_cache:*`, que són l'historial | `options/settings-cache.js:13` | L'historial desapareix sense que el diàleg ho digui | Text: «S'esborrarà tot l'historial (N resums). No es pot desfer.» |
| 0.13 | L'historial de canvis talla les línies de continuació i no escapa `<` `>` | `scripts/update-changelog-html.mjs:28-34,67` | Frases a mitges; `<all_urls>` desapareix | Acumular línies sagnades; escapar HTML abans de les substitucions inline (si no, s'escapen els tags generats); exportar `parseChangelog` per poder-hi posar test |

**Confirmat també:** el «✓ Afegit a Obsidian» (`sidebar/anki.js:299-305`) surt només
en obrir l'URL `obsidian://`; reformular com «Enviat a Obsidian», perquè
l'extensió no pot saber si ha funcionat.

## Nivell 1 — Guanys ràpids

Esforç majoritàriament S (el fitxer de tokens compartit és M): tokens de color,
ARIA i textos. Es pot fer en commits temàtics, però cada fix d'accessibilitat
porta el seu test (jsdom ja és a `package.json`).

### Tokens i contrast (WCAG AA)

- **Un sol fitxer de tokens** (`shared/tokens.css`) per a la barra lateral, la
  configuració i el visor PDF. Cal un mapa semàntic: `--primary-color` vol dir
  text a la configuració i blau a la barra lateral, i el visor PDF té una paleta
  fixa. No és automàtic.
- **Crema (solarized):** el primari `#ad8301` falla per a tot text. Enfosquir-lo a
  `#806000` (5,12:1 sobre el fons de la barra lateral, 4,58:1 sobre el secundari).
  A la configuració, el text atenuat falla sobre els fons de menú i inputs i el
  text base també.
- **Fosc:** botó primari blanc sobre `#4385BE` (3,93:1; usar text fosc com la barra
  lateral); `--error-text` (3,97:1); el hover dels enllaços els fa *menys*
  llegibles (2,93:1).
- **Peu de la barra lateral:** `--footer-text` falla a clar, Crema i gris suau amb
  lletra d'11 px.
- **Colors fixos fora de tokens:** verd d'èxit `#28a745` (2,98:1 en clar; en fosc
  passa), `#666` del cronòmetre (només falla en fosc), interruptors
  `#ccc`/`#0060df`, estrelles, l'historial de canvis amb `style="color:#444"`
  (1,96:1 en fosc). Afegir `--success`, `--danger`, `--focus`, `--plugin-*` per
  tema.
- **Superposicions `rgba(0,0,0,…)`** desapareixen en fosc: l'estat actiu de
  Biònica només es distingeix pel color (1.4.1). Usar `color-mix()` o un token
  `--active-bg` i un indicador no cromàtic.
- Declarar `color-scheme` per tema perquè selects, barres de desplaçament i
  caselles natives segueixin el mode fosc.

### Accessibilitat de base

- **Mides tàctils (2.5.8):** botons del peu, selector de model, estrella de
  favorit i interruptors del mapa per sota de 24×24 px.
- **Regió d'estat per al streaming:** el contingut sense `aria-live`; una regió
  `role="status"` persistent i buida des de la càrrega (l'actual `#loading` té
  `role=status` però s'amaga amb `hidden`) que anunciï «Generant resum…», «Resum
  complet», «Aturat». L'avís «aturat» no ha d'anar al quadre vermell `role=alert`.
- **Focus:** en obrir/tancar l'historial, el text font, els panells de
  configuració i el mapa, el focus cau a `<body>`. Moure'l a l'encapçalament del
  panell i retornar-lo al disparador.
- **Selector de models de la configuració:** files i estrelles són `<span>` només
  clicables. Convertir en `<button>` (estrella amb `aria-pressed`), tancar amb
  Esc, `aria-expanded` al botó.
- **Formularis:** cap `aria-describedby` a tota la pàgina; toast `#status` sense
  `role=status` i amb bug de temporitzador; `:focus-visible` unificat (l'anell
  dels inputs és un 5 % d'alfa, invisible).
- **Historial:** `li role=button` amb `span role=button` a dins (interactius
  niats). Botons reals germans.
- **Mapa conceptual:** el renderitzador accessible en `<details>` ja existeix
  (`parseConceptTree`) però només com a fallback. Afegir un botó «Vista de
  llista», `role=img` + etiqueta a l'SVG i `aria-expanded` als nodes.
- **Anki:** totes les caselles es diuen igual («Incloure a l'exportació»).
  Etiquetar-les amb la pregunta.

### Microcopy (català)

El projecte ja va triar l'**infinitiu** per als botons (CHANGELOG v2.4.1, també
`LEARNINGS.md`). No cal canviar la convenció, sinó corregir els que no la segueixen:

| Avui | Proposta | On |
| --- | --- | --- |
| Configurar Ara | Configurar ara | onboarding de la barra lateral |
| Falta configurar l'API Key / Google Gemini API Key | Falta la clau d'API de Gemini / Clau d'API de Google Gemini | barra lateral, configuració |
| Obre configuració | Obrir la configuració | avís de prompt nou |
| Nova versió del prompt de aprofundiment | …del prompt d'aprofundiment (apostrofació) | `sidebar.js:342-381` |
| Genera més / Afinar | Generar més / Afinar | panell Anki |
| Desplega tot / Replega tot vs Desplegar/plegar tot | Desplegar-ho tot / Plegar-ho tot | mapa conceptual |
| Apropar/Allunyar (PDF) vs Ampliar/Reduir (mapa) | Ampliar / Reduir a tot arreu | visor PDF, mapa |
| Estimacio | Estimació | `ui.js:511,516` |
| Proveu-ho, afegiu, canvieu (vosaltres) | tracte de tu a tot arreu | missatges d'error de `summary.js` |
| «Resumidor» (títol de la pàgina) | Resumir | `sidebar.html:6` |
| «Validar» / «Validació» / «Validació científica» | Validació científica | barra, historial, web |
| «Buidar memòria cau» | Esborrar l'historial de resums | configuració |
| Recarrega la pestanya (F5) | Recarrega la pestanya | error [006] (F5 no val a macOS) |

A més: codis interns (`[007]`, `[PDF-013]`) al final del missatge i en gris, no al
davant; `[003]` està duplicat; els errors 400 de Google arriben en anglès sense
traduir (afegir branca i «Detalls» plegable).

Imperatius que s'havien escapat: a Anki, «Descarta» → «Descartar», «Descarta-ho
tot» → «Descartar-ho tot», «Afegeix (N)» → «Afegir a Obsidian (N)»,
«Selecciona-ho tot / Deselecciona-ho tot» → «Seleccionar-ho tot /
Desseleccionar-ho tot»; l'`aria-label` «Selecciona model» → «Seleccionar el
model». «API Key» que queden: `ui.js:527` («Falta la clau d'API»), `ui.js:568`
(«Obtenir una clau d'API gratuïta →») i `summary.js:155` («la clau d'API»); a
`ui.js:547`, «per connectar-se amb Google Gemini».

**Decisió pendent:** «Validació científica» i «Explica-ho fàcil» són noms de
funcionalitat i no verbs de botó; cal dir explícitament si la regla de
l'infinitiu s'hi aplica.

### Altres correccions petites

- Activar **Copiar** per defecte: l'usuari nou rep un resum sense cap acció
  visible per endur-se'l.
- Estils `.btn-primary` per als CTA «Configurar» (avui botons nadius grisos, fins
  i tot en fosc).
- Peu: ↑ enviats abans de ↓ rebuts, inicialitzar a «–», cronòmetre vermell en
  error i «De la memòria cau» en un encert; `title` amb el nom complet del model
  truncat.
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

## Nivell 2 — Canvis estructurals

Canvis d'esforç M que redefineixen com es veu i s'usa cada superfície. Cadascun
mereix una entrada pròpia al backlog.

### 2.1 Barra d'eines agrupada i enganxosa

Avui: una fila plana, ordre lliure, sense salt de línia, que es desplaça amb el
text (el botó d'aturar desapareix en un resum llarg).

- Tres grups fixos amb separador: **Generar** (Resumir com a botó primari amb
  etiqueta + menú «Més modes ▾») · **Exportar** (Copiar, Obsidian, Anki) ·
  **Vista** (Biònica) · ⚙. L'usuari reordena dins de cada grup.
- Desbordament «⋯» quan no hi cap, o `flex-wrap` com a mínim; reduir el `gap`.
- Barra + títol de la pàgina com una sola capçalera `position: sticky`, amb
  `scroll-padding` perquè no tapi el focus (2.4.11).
- Un sol joc d'icones SVG per tipus (barra, peu i historial); fora els emoji
  🔬📊🧠🃏🕐⚡. «Aprofundir» deixa de ser un «+».

### 2.2 Onboarding dins del panell amb verificació de la clau

- Estat buit amb 3 passos numerats: 1) obtenir la clau a AI Studio (enllaç
  directe), 2) enganxar-la aquí mateix, 3) «Resumir aquesta pàgina». Sense enviar
  l'usuari a una pestanya nova.
- Botó «Comprovar» que fa `GET /v1beta/models`: valida la clau i omple la llista
  de models disponibles. `trim()`, comprovació del prefix `AIza`, mostrar/amagar,
  emmascarar amb els 4 últims caràcters.
- Missatges per codi: 400 → clau incorrecta; 403 → API no habilitada; 429 → límit
  gratuït, provar Flash-Lite; 503 → servei saturat, reintentant.
- Nota de privacitat honesta d'una línia: el text de la pàgina s'envia a Google;
  amb la clau gratuïta Google pot usar-lo per millorar els models. El text ha de
  coincidir amb el consentiment de dades que declara el manifest de Firefox. No
  fixar límits de quota a la UI (canvien; enllaçar el tauler d'AI Studio).
- Estat en repòs amb clau: en lloc del blanc actual, títol de la pestanya activa +
  botó «Resumir aquesta pàgina» + els resums ja desats per a aquesta URL.

### 2.3 Estats de càrrega i streaming

- Etapes visibles: «Llegint la pàgina…» → «Enviant a {model}…» → «Provant
  {model2} (quota esgotada)…». Els tres punts, decoratius.
- Renderitzar Markdown de forma incremental (cada ~250 ms; re-analitzar tot el
  text és quadràtic en resums llargs: renderitzar només el tram nou o augmentar
  l'interval) en lloc de text cru amb `**` i `#` i després un salt de maquetació.
  Per a Anki i mapa: línia de progrés, no JSON cru.
- El renderitzador no admet subvinyetes sagnades, llistes numerades, cursiva ni
  `---`, que Gemini fa servir sovint (`ui.js:374-389`). Ampliar-lo o vendoritzar un
  renderitzador petit i segur.
- Error a sobre del contingut (avui queda al final d'un text llarg, fora de
  pantalla).
- Extracció de PDF local amb estat de càrrega i botons desactivats; obrir el visor
  amb `active:false`.

### 2.4 Configuració: desat automàtic i arquitectura d'informació

- **Desat automàtic** d'interruptors, ordre, tema i selects amb toast «Desat»;
  desat explícit només per a les àrees de text llargues, amb indicador de canvis
  pendents i guarda `beforeunload`. Elimina els botons «Desar» per pestanya (el de
  Plugins surt a dalt de tot per un bug d'ordre).
- **Ordre:** clau d'API abans del model; el prompt principal de resum fora del
  submenú de plugins; «Sobre» al final de la navegació.
- **Selector de models comprensible:** nom llegible al camp (no l'ID), insígnies
  «Ràpid i econòmic / Equilibrat / Màxima qualitat» i «Recomanat». Les dades ja són
  a `CURATED_MODELS`; avui no es mostren.
- **Revelació progressiva:** prompts plegats sota «Personalitzar instruccions
  (avançat)» amb insígnia «Personalitzat», llegenda de variables (`{{COUNT}}`,
  `{{LANG}}`) i bloqueig de prompt buit.
- **Enllaços profunds** `#tab=…&focus=apiKey` perquè la barra lateral obri la
  pestanya i el camp correctes.
- **Rutes d'Obsidian i Anki per defecte neutres:** avui són l'estructura personal
  de l'autor (`[4 Arxiu/Notes/]YYYY/gggg-[W]ww`). Afegir vista prèvia «Exemple:
  Resumir/2026-10-11.md».

### 2.5 Configuració responsiva

Cap media query avui. A `max-width: 720px`: navegació en pestanyes horitzontals o
select, padding 24/16 px, controls dels plugins sota el text, `.sidebar` amb
`overflow-y:auto`. El fons del menú lateral s'acaba a l'alçada de la finestra.

### 2.6 Historial útil

- Cerca per títol/URL i filtre per tipus.
- Esborrar per entrada (`deleteSummaryCache` existeix però ningú no la crida) amb
  toast «Desfer» de 5 s.
- Estat buit que expliqui la retenció (dies i que és només en aquest navegador).
- Dates absolutes a partir d'una setmana; «ara mateix» en lloc de «fa 1 min».
- Clau de memòria cau dels PDF locals amb mida i data, no només el nom (dos
  `document.pdf` es trepitgen).

## Nivell 3 — Estratègia de producte

La direcció és fer de Resumir el resumidor més **verificable**: el mercat ja ha
convertit en mínim el xat de seguiment i els segells de temps, i la diferència ara
és la confiança. Ordenat per relació impacte/esforç.

| Idea | Què veu l'usuari | Per què | Referència | Esforç |
| --- | --- | --- | --- | --- |
| Línia de procedència | «Basat en 3.200 paraules de [títol] · transcripció auto (en) · Gemini 3.1 Flash-Lite · 12.400 tokens» sota cada resum, amb avís explícit si s'ha truncat | El senyal de confiança més barat; fa visibles els talls silenciosos (avui `metadata.truncated` del PDF no es mostra mai). Millor tokens que cost en €: els usuaris de la clau gratuïta no paguen res i els preus envelleixen | Firefox Link Previews, PAIR Guidebook | S–M |
| Pestanyes per tipus | Sota el títol: Resum · Aprofundiment · Mapa…; les que ja estan en memòria cau, actives; la resta, «Generar» | Substitueix els emoji diminuts del peu i el «mode historial» confús | Kagi, Gemini en Chrome | M |
| Format i llargada com a controls (esforç més a prop de L: multiplica variants de prompt contra el versionat per plugin i se solapa amb Aprofundir i Explica-ho fàcil) | Resumir + selector compacte: Punts clau / TL;DR / Prosa × Curt / Mitjà / Llarg; els plugins rics, secundaris | Redueix la paràlisi d'elecció de la fila d'icones | Chrome Summarizer API, Kagi | M |
| Vinyetes amb cita verificada | Cada punt porta un ↗ que fa scroll i ressalta el passatge a la pestanya (`#:~:text=`); la cita es comprova literalment contra el text extret | Les cites inventades augmenten la falsa confiança; verificades, la calibren | Perplexity Comet; AAAI 2025 (Ding et al.) | L |
| Segells de temps a YouTube i pàgines als PDF | Enllaços que porten el vídeo a l'instant o el visor a `#page=N` | Mínim en tots els competidors de vídeo; fan també de font | Eightify, Merlin, Glasp | M |
| Calaix «Text enviat» millorat | El botó ja existeix al peu; fer-lo visible a la línia de procedència i destacar si s'ha capturat un bàner de galetes en lloc de l'article | Converteix errors d'extracció silenciosos en errors visibles | Shape of AI: Footprints | S |
| Avís de resum d'una altra pàgina | «Aquest resum és de [títol]. Resumir aquesta pestanya →» en canviar de pestanya | La barra lateral de Firefox és global per finestra | Gemini en Chrome (xip de context) | S |
| Refinadors ràpids | Botons «Més curt» i «Més detall» sota el resum (Explica-ho fàcil ja existeix com a plugin) | Seguiment sense xat complet | NN/g «Prompt controls» | M |
| Dreceres de teclat | `commands` al manifest: obrir el panell i resumir; Esc per aturar o tancar panells | Avui no n'hi ha cap | — | S |
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
2. **Fase B — Configuració que no perd canvis** (0.10–0.13 + desat automàtic de
   2.4). El desat automàtic s'ha de fer abans de redissenyar la pàgina.
3. **Fase C — Tokens compartits i accessibilitat** (Nivell 1).
   `shared/tokens.css` primer, amb mapa semàntic. Revisió amb lector de pantalla
   durant el streaming, no només al final.
4. **Fase D — Estructura** (2.1 barra d'eines, 2.2 onboarding, 2.3 estats, la resta
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
| Configuració | La plantilla Markdown per defecte és diferent a la configuració i a la barra lateral | `settings-defaults.js:4`, `sidebar.js:259` | Mitjana | S |
| Configuració | «Restaurar» sobreescriu un prompt llarg sense confirmació i, des de l'avís, desa tota la pàgina | `settings-options.js:168-212`, `settings.js:69-71` | Mitjana | S |
| Configuració | Botons Amunt/Avall amb el mateix nom per a tots els plugins; en pujar es perd el focus (es mou l'element enfocat), en baixar no, i en desactivar-se als extrems també | `settings-order.js:61-95` | Mitjana | M |
| Configuració | Un prompt massa gran fa fallar tot el desat amb un error genèric (quota per element de `storage.sync`) | `settings-options.js:72-81` | Baixa | S |
| Configuració | Les estadístiques d'ús es desen però no es mostren ni es poden reiniciar | `storage.local` | Baixa | M |
| Configuració | HTML de plugins duplicat; un registre únic de plugins evitaria la deriva | `settings.html`, `settings-sidebar.js` | Baixa | M |
| Historial de canvis | Entrades de desenvolupador (CI, npm, Defuddle), totes les versions desplegades, avís de seguretat enterrat | `settings.html:1252-1310` | Mitjana | S |
| Mapa conceptual | L'export PNG només captura els nodes desplegats (per defecte, nivells 0–1) sense dir-ho | `markmap-native.js:666-720` | Mitjana | M |
| Mapa conceptual | La roda sempre fa zoom: al trackpad no es pot desplaçar ni fer scroll del panell | `markmap-native.js:581-595` | Mitjana | S |
| Mapa conceptual | Expandir/plegar destrueix el node amb focus; a l'overlay trenca la trampa de focus | `markmap-native.js:400-406` | Alta | S |
| Mapa conceptual | No hi ha botó d'ajustar a la vista; només mouse (sense pointer/touch) | `conceptmap.js:266-282` | Mitjana | S–M |
| Mapa conceptual | Pantalla completa impossible des d'un PDF local, amb un consell enganyador | `conceptmap.js:349-391` | Mitjana | M |
| Mapa conceptual | `confirm()` d'origen diferent salta gairebé sempre que es ve de l'historial | `conceptmap.js:398-405` | Baixa | S |
| Anki | «Afegeix (N)» no diu que va a una nota d'Obsidian; «✓ Afegit a Obsidian» sense confirmació (només s'ha obert l'URL `obsidian://`) | `anki.js:202-210,299-307` | Mitjana | S |
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
